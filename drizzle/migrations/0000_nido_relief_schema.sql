CREATE TYPE public.impact_category AS ENUM ('roof','water','energy','rebuild','heal');
CREATE TYPE public.household_status AS ENUM ('needs','progress','delivered');
CREATE TYPE public.expense_method AS ENUM ('Factura','Nequi','Efectivo + Acta');
CREATE TYPE public.doc_type AS ENUM ('CENSUS_FORM','SIGNED_ACTA','HARDWARE_RECEIPT');
CREATE TYPE public.need_status AS ENUM ('open','delivered');

CREATE TABLE public.households (
 id text PRIMARY KEY, name text, vereda text NOT NULL, community text NOT NULL,
 members integer NOT NULL DEFAULT 1 CHECK (members > 0),
 phase smallint NOT NULL DEFAULT 1 CHECK (phase BETWEEN 1 AND 3),
 status public.household_status NOT NULL DEFAULT 'needs', lat double precision, lng double precision,
 note text, cost_usd numeric NOT NULL DEFAULT 0 CHECK (cost_usd >= 0)
);
GRANT SELECT (id,vereda,community,members,phase,status,cost_usd) ON public.households TO anon;
GRANT SELECT,INSERT,UPDATE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY households_public_read ON public.households FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY households_staff_insert ON public.households FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY households_staff_update ON public.households FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
COMMENT ON COLUMN public.households.name IS 'Private staff-only family name; anonymous reads must explicitly select public columns.';
COMMENT ON COLUMN public.households.lat IS 'Private exact household location; excluded from anonymous grants and raw realtime publication.';
CREATE VIEW public.public_households WITH (security_invoker=true) AS SELECT id,vereda,community,members,phase,status,cost_usd FROM public.households;
GRANT SELECT ON public.public_households TO anon,authenticated,service_role;

CREATE TABLE public.documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), doc_type public.doc_type NOT NULL,
 image_path text, transcription text, extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_staff_read ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY documents_staff_insert ON public.documents FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE TABLE public.household_needs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id text NOT NULL REFERENCES public.households(id),
 item text NOT NULL CHECK (length(trim(item)) > 0), qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
 unit_usd numeric NOT NULL DEFAULT 0 CHECK (unit_usd >= 0), category public.impact_category NOT NULL,
 status public.need_status NOT NULL DEFAULT 'open', document_id uuid REFERENCES public.documents(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.household_needs TO anon;
GRANT SELECT,INSERT,UPDATE ON public.household_needs TO authenticated;
GRANT ALL ON public.household_needs TO service_role;
ALTER TABLE public.household_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY needs_public_read ON public.household_needs FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY needs_staff_insert ON public.household_needs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY needs_staff_update ON public.household_needs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date NOT NULL DEFAULT CURRENT_DATE, vendor text NOT NULL,
 method public.expense_method NOT NULL, description text NOT NULL DEFAULT '',
 cop numeric NOT NULL DEFAULT 0 CHECK (cop >= 0), usd numeric NOT NULL DEFAULT 0 CHECK (usd >= 0),
 phase smallint NOT NULL DEFAULT 1 CHECK (phase BETWEEN 1 AND 3), receipt text UNIQUE NOT NULL CHECK (length(trim(receipt)) > 0),
 source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ai','manual','seed')),
 document_id uuid REFERENCES public.documents(id), created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.expenses TO anon;
GRANT SELECT,INSERT,UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_public_read ON public.expenses FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY expenses_staff_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY expenses_staff_update ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expense_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
 item text NOT NULL CHECK (length(trim(item)) > 0), qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
 category public.impact_category NOT NULL, usd numeric NOT NULL DEFAULT 0 CHECK (usd >= 0)
);
GRANT SELECT ON public.expense_items TO anon;
GRANT SELECT,INSERT,UPDATE ON public.expense_items TO authenticated;
GRANT ALL ON public.expense_items TO service_role;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY items_public_read ON public.expense_items FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY items_staff_insert ON public.expense_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY items_staff_update ON public.expense_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expense_households (
 expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
 household_id text NOT NULL REFERENCES public.households(id), PRIMARY KEY (expense_id,household_id)
);
GRANT SELECT ON public.expense_households TO anon;
GRANT SELECT,INSERT,UPDATE ON public.expense_households TO authenticated;
GRANT ALL ON public.expense_households TO service_role;
ALTER TABLE public.expense_households ENABLE ROW LEVEL SECURITY;
CREATE POLICY links_public_read ON public.expense_households FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY links_staff_insert ON public.expense_households FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY links_staff_update ON public.expense_households FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX needs_household_idx ON public.household_needs(household_id);
CREATE INDEX needs_document_idx ON public.household_needs(document_id);
CREATE INDEX items_expense_idx ON public.expense_items(expense_id);
CREATE INDEX links_household_idx ON public.expense_households(household_id);
CREATE INDEX expenses_document_idx ON public.expenses(document_id);
CREATE VIEW public.category_totals WITH (security_invoker=true) AS
 SELECT c.category,
 COALESCE((SELECT sum(i.usd) FROM public.expense_items i WHERE i.category=c.category),0)::numeric AS spent_usd,
 COALESCE((SELECT sum(n.qty*n.unit_usd) FROM public.household_needs n WHERE n.category=c.category AND n.status='open'),0)::numeric AS needed_usd
 FROM unnest(enum_range(NULL::public.impact_category)) AS c(category);
GRANT SELECT ON public.category_totals TO anon,authenticated,service_role;

CREATE FUNCTION public.approve_expense(p_household_id text,p_vendor text,p_method public.expense_method,p_receipt text,p_date date,p_cop numeric,p_usd numeric,p_phase smallint,p_items jsonb,p_document_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid; v_items jsonb; v_description text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to approve expenses'; END IF;
 PERFORM id FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Household % does not exist',p_household_id; END IF;
 IF EXISTS (SELECT 1 FROM public.expenses WHERE receipt=p_receipt) THEN RAISE EXCEPTION 'Receipt % already exists',p_receipt; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Items must be a nonempty array'; END IF;
 IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Items must be a nonempty array'; END IF;
 v_items := p_items;
 IF EXISTS (SELECT 1 FROM jsonb_to_recordset(v_items) AS x(item text,qty integer,category public.impact_category,usd numeric) WHERE item IS NULL OR trim(item)='' OR qty IS NULL OR qty<=0 OR category IS NULL OR usd IS NULL OR usd<0) THEN RAISE EXCEPTION 'Each item requires a name, positive quantity, category and nonnegative USD'; END IF;
 IF p_usd IS NULL OR p_usd<0 OR p_cop IS NULL OR p_cop<0 THEN RAISE EXCEPTION 'Expense amounts must be nonnegative'; END IF;
 SELECT string_agg(trim(x.item),', ' ORDER BY x.ordinality) INTO v_description FROM jsonb_array_elements(v_items) WITH ORDINALITY AS x(value,ordinality) CROSS JOIN LATERAL (SELECT x.value->>'item' AS item) AS y;
 INSERT INTO public.expenses(date,vendor,method,description,cop,usd,phase,receipt,source,document_id)
 VALUES(p_date,p_vendor,p_method,v_description,p_cop,p_usd,p_phase,p_receipt,CASE WHEN p_document_id IS NULL THEN 'manual' ELSE 'ai' END,p_document_id) RETURNING id INTO v_id;
 INSERT INTO public.expense_items(expense_id,item,qty,category,usd) SELECT v_id,trim(x.item),x.qty,x.category,x.usd FROM jsonb_to_recordset(v_items) AS x(item text,qty integer,category public.impact_category,usd numeric);
 INSERT INTO public.expense_households(expense_id,household_id) VALUES(v_id,p_household_id);
 UPDATE public.household_needs n SET status='delivered' WHERE n.household_id=p_household_id AND EXISTS(SELECT 1 FROM jsonb_to_recordset(v_items) AS x(item text) WHERE trim(x.item)=n.item);
 UPDATE public.households SET status='delivered',cost_usd=cost_usd+p_usd WHERE id=p_household_id;
 RETURN v_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Receipt % already exists',p_receipt;
END $$;
REVOKE ALL ON FUNCTION public.approve_expense(text,text,public.expense_method,text,date,numeric,numeric,smallint,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_expense(text,text,public.expense_method,text,date,numeric,numeric,smallint,jsonb,uuid) TO authenticated;

CREATE FUNCTION public.approve_census(p_household_id text,p_document_id uuid,p_items jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to approve census forms'; END IF;
 PERFORM id FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Household % does not exist',p_household_id; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Items must be an array'; END IF;
 INSERT INTO public.household_needs(household_id,item,qty,category,unit_usd,document_id)
 SELECT p_household_id,trim(x.item),x.qty,x.category,x.unit_usd,p_document_id FROM jsonb_to_recordset(p_items) AS x(item text,qty integer,category public.impact_category,unit_usd numeric);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 UPDATE public.households SET status='needs' WHERE id=p_household_id AND status<>'delivered';
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.approve_census(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_census(text,uuid,jsonb) TO authenticated;

CREATE POLICY documents_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='documents');
CREATE POLICY documents_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='documents');

ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses,public.expense_items,public.household_needs;
COMMENT ON TABLE public.households IS 'Raw realtime is intentionally disabled: anonymous column grants do not sanitize realtime row payloads. Staff receive data-free private household-change notifications.';
CREATE FUNCTION public.notify_household_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE staff_user uuid;
BEGIN
 FOR staff_user IN SELECT id FROM auth.users LOOP
  PERFORM realtime.send('{}'::jsonb,'households_changed','nido-households:'||staff_user::text,true);
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_household_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER nido_household_change AFTER INSERT OR UPDATE ON public.households FOR EACH STATEMENT EXECUTE FUNCTION public.notify_household_change();
CREATE POLICY nido_household_notifications ON realtime.messages FOR SELECT TO authenticated USING (realtime.topic()='nido-households:'||auth.uid()::text);