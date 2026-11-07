CREATE OR REPLACE FUNCTION public.approve_expense(p_household_id text,p_vendor text,p_method public.expense_method,p_receipt text,p_date date,p_cop numeric,p_usd numeric,p_phase smallint,p_items jsonb,p_document_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid; v_description text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to approve expenses'; END IF;
 PERFORM id FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Household % does not exist',p_household_id; END IF;
 IF EXISTS (SELECT 1 FROM public.expenses WHERE receipt=p_receipt) THEN RAISE EXCEPTION 'Receipt % already exists',p_receipt; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Items must be a nonempty array'; END IF;
 IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Items must be a nonempty array'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item text,qty integer,category public.impact_category,usd numeric) WHERE item IS NULL OR trim(item)='' OR qty IS NULL OR qty<=0 OR category IS NULL OR usd IS NULL OR usd<0) THEN RAISE EXCEPTION 'Each item requires a name, positive quantity, category and nonnegative USD'; END IF;
 IF p_usd IS NULL OR p_usd<0 OR p_cop IS NULL OR p_cop<0 THEN RAISE EXCEPTION 'Expense amounts must be nonnegative'; END IF;
 SELECT string_agg(trim(x.value->>'item'),', ' ORDER BY x.ordinality) INTO v_description FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(value,ordinality);
 INSERT INTO public.expenses(date,vendor,method,description,cop,usd,phase,receipt,source,document_id)
 VALUES(p_date,p_vendor,p_method,v_description,p_cop,p_usd,p_phase,p_receipt,CASE WHEN p_document_id IS NULL THEN 'manual' ELSE 'ai' END,p_document_id) RETURNING id INTO v_id;
 INSERT INTO public.expense_items(expense_id,item,qty,category,usd) SELECT v_id,trim(x.item),x.qty,x.category,x.usd FROM jsonb_to_recordset(p_items) AS x(item text,qty integer,category public.impact_category,usd numeric);
 INSERT INTO public.expense_households(expense_id,household_id) VALUES(v_id,p_household_id);
 UPDATE public.household_needs n SET status='delivered' WHERE n.household_id=p_household_id AND EXISTS(SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item text) WHERE trim(x.item)=n.item);
 UPDATE public.households SET status='delivered',cost_usd=cost_usd+p_usd WHERE id=p_household_id;
 RETURN v_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Receipt % already exists',p_receipt;
END $$;