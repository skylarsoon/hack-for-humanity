// Isolated PostgreSQL tests execute the actual migration SQL, never production writes.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { seedHouseholds, seedExpenses, SUPPLIES } from "../lib/nido-data";
import { categorize } from "../lib/donor-impact";

let db: PGlite;
const userId = "10000000-0000-4000-8000-000000000001";
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA realtime;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
    CREATE TABLE storage.objects(id uuid,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE TABLE realtime.messages(id uuid); ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION realtime.send(jsonb,text,text,boolean) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('realtime.topic',true) $$;
  `);
  const dir = new URL("../../drizzle/migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    // PGlite has no replication service; all policies, functions and grants run unchanged.
    await db.exec(sql.replace(/ALTER PUBLICATION supabase_realtime ADD TABLE[^;]+;/g, ""));
  }
  for (const h of seedHouseholds()) {
    await db.query("INSERT INTO households(id,name,vereda,community,members,phase,status,lat,lng,note,cost_usd) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [h.id,h.name,h.vereda,h.community,h.members,h.phase,h.status,h.lat,h.lng,h.note??null,h.costUsd]);
    for (const [status, items] of [["open", h.needs], ["delivered",h.delivered]] as const) {
      for (const item of items) await db.query("INSERT INTO household_needs(household_id,item,qty,unit_usd,category,status) VALUES($1,$2,1,$3,$4,$5)",[h.id,item,SUPPLIES.find(s=>s.key===item)?.usd??0,categorize(item),status]);
    }
  }
  for (const e of seedExpenses()) {
    const result = await db.query<{id:string}>("INSERT INTO expenses(date,vendor,method,description,cop,usd,phase,receipt,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'seed') RETURNING id",[e.date,e.vendor,e.method,e.description,e.usd*3230,e.usd,e.phase,e.receipt]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Seed expense missing");
    await db.query("INSERT INTO expense_items(expense_id,item,qty,category,usd) VALUES($1,$2,1,$3,$4)",[id,e.description,categorize(e.description),e.usd]);
    for (const hid of e.householdIds) await db.query("INSERT INTO expense_households VALUES($1,$2)",[id,hid]);
  }
}, 20000);
afterEach(async () => { await db.close(); });
async function staff() {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[userId]);
  await db.exec("SET ROLE authenticated");
}
async function approve(hid="HH_03",receipt="TEST-001",items=[{item:"Tejas de Zinc",qty:2,category:"roof",usd:52}]) {
  return db.query("SELECT approve_expense($1,'Test vendor','Factura',$2,'2026-11-07',167960,52,1::smallint,$3::jsonb,NULL)",[hid,receipt,JSON.stringify(items)]);
}
describe("Nido database rules", () => {
  it("seeds eight households, five expenses, eleven links and nineteen needs", async () => {
    const r=await db.query("SELECT (SELECT count(*) FROM households) h,(SELECT count(*) FROM expenses) e,(SELECT count(*) FROM expense_households) l,(SELECT count(*) FROM household_needs) n");
    expect(r.rows[0]).toEqual({h:8,e:5,l:11,n:19});
  });
  it("converts COP using 3230 for each seeded expense",async()=>{
    const r=await db.query("SELECT cop FROM expenses ORDER BY date");
    expect(r.rows.map(x=>Number(x.cop))).toEqual([4005200,6783000,5329500,2519400,1388900]);
  });
  it("returns all five categories without duplicating joined amounts",async()=>{
    const r=await db.query("SELECT * FROM category_totals ORDER BY category");
    expect(r.rows.map(x=>[x.category,Number(x.spent_usd),Number(x.needed_usd)])).toEqual([["roof",1240,52],["water",780,26],["energy",2100,35],["rebuild",1650,360],["heal",430,15]]);
  });
  it("allows anonymous public ID reads but not names or coordinates",async()=>{
    await db.exec("SET ROLE anon");
    expect((await db.query("SELECT * FROM public_households")).rows).toHaveLength(8);
    await expect(db.query("SELECT name,lat,lng FROM households")).rejects.toThrow(/permission denied/);
  });
  it("denies anonymous documents and approval calls",async()=>{
    await db.exec("SET ROLE anon");
    await expect(db.query("SELECT * FROM documents")).rejects.toThrow(/permission denied/);
    await expect(approve()).rejects.toThrow(/permission denied/);
  });
  it("denies DELETE for staff",async()=>{
    await staff();
    await expect(db.query("DELETE FROM household_needs WHERE household_id='HH_03'")).rejects.toThrow(/permission denied/);
  });
  it("approves expense, items, link, needs and household cost in one transaction",async()=>{
    await staff(); await approve();
    expect((await db.query("SELECT status,cost_usd FROM households WHERE id='HH_03'")).rows[0]).toEqual({status:"delivered",cost_usd:"52"});
    expect((await db.query("SELECT status FROM household_needs WHERE household_id='HH_03' AND item='Tejas de Zinc'")).rows[0]).toEqual({status:"delivered"});
    expect((await db.query("SELECT count(*) n FROM expense_items i JOIN expense_households h ON h.expense_id=i.expense_id JOIN expenses e ON e.id=i.expense_id WHERE e.receipt='TEST-001'")).rows[0]).toEqual({n:1});
  });
  it("rejects duplicate receipts without adding household costs again",async()=>{
    await staff(); await approve();
    await expect(approve()).rejects.toThrow(/already exists/);
    expect((await db.query("SELECT cost_usd FROM households WHERE id='HH_03'")).rows[0]).toEqual({cost_usd:"52"});
  });
  it("rejects unknown households without recording expenses",async()=>{
    await staff(); await expect(approve("HH_99")).rejects.toThrow(/does not exist/);
    expect((await db.query("SELECT count(*) n FROM expenses")).rows[0]).toEqual({n:5});
  });
  it("rolls back invalid item quantities",async()=>{
    await staff(); await expect(approve("HH_03","BAD",[{item:"Tejas de Zinc",qty:0,category:"roof",usd:52}])).rejects.toThrow(/positive quantity/);
    expect((await db.query("SELECT cost_usd FROM households WHERE id='HH_03'")).rows[0]).toEqual({cost_usd:"0"});
  });
  it("census inserts open needs and leaves delivered households delivered",async()=>{
    await staff();
    const r=await db.query("SELECT approve_census('HH_02',NULL,'[{\"item\":\"Kit Agua/Higiene\",\"qty\":2,\"category\":\"water\",\"unit_usd\":26}]') n");
    expect(r.rows[0]).toEqual({n:1});
    expect((await db.query("SELECT status FROM households WHERE id='HH_02'")).rows[0]).toEqual({status:"delivered"});
  });
  it("census changes a progressing household to needs",async()=>{
    await staff(); await db.query("SELECT approve_census('HH_06',NULL,'[{\"item\":\"Madera Bahareque\",\"qty\":1,\"category\":\"rebuild\",\"unit_usd\":180}]')");
    expect((await db.query("SELECT status FROM households WHERE id='HH_06'")).rows[0]).toEqual({status:"needs"});
  });
});