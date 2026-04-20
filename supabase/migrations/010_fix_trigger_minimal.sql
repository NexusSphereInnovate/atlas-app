-- ================================================================
-- 010 — Trigger handle_new_user : version ultra-robuste
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================
-- Cette version utilise un bloc BEGIN...EXCEPTION imbriqué (savepoint)
-- qui est PLUS fiable que l'exception au niveau de la fonction.
-- Le trigger ne peut plus jamais bloquer la création d'un auth user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloc imbriqué = savepoint PostgreSQL. Toute erreur ici est
  -- silencieusement ignorée et l'auth user est créé quand même.
  BEGIN
    INSERT INTO public.user_profiles (
      id, email, first_name, last_name, role, is_active
    ) VALUES (
      NEW.id,
      NEW.email,
      coalesce(NEW.raw_user_meta_data->>'first_name', ''),
      coalesce(NEW.raw_user_meta_data->>'last_name', ''),
      'client',
      false
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ignore silencieusement toute erreur
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
