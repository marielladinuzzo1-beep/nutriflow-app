-- ============================================================
-- NutriFlow - Migrazione 007: Feature batch
-- 1) recipe su meal_plan_items
-- 2) meal_templates + meal_template_items
-- ============================================================

-- 1. Campo ricetta su ogni alimento del piano
ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS recipe TEXT;

-- 2. Tabella template pasti
CREATE TABLE IF NOT EXISTS public.meal_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  meal_type     TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_templates' AND policyname = 'meal_templates_owner'
  ) THEN
    CREATE POLICY "meal_templates_owner" ON public.meal_templates
      FOR ALL USING (nutritionist_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 3. Voci del template
CREATE TABLE IF NOT EXISTS public.meal_template_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  food_id     UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name   TEXT NOT NULL,
  quantity_g  NUMERIC(6,1) NOT NULL,
  quantity_max_g NUMERIC(6,1),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_template_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_template_items' AND policyname = 'meal_template_items_owner'
  ) THEN
    CREATE POLICY "meal_template_items_owner" ON public.meal_template_items
      FOR ALL USING (
        template_id IN (
          SELECT id FROM public.meal_templates
          WHERE nutritionist_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;
