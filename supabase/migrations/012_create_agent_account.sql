-- ================================================================
-- 012 — Créer le compte agent : agent@atlas-incorporate.com
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'agent@atlas-incorporate.com';

  IF v_user_id IS NULL THEN
    -- Générer un UUID pour le nouvel utilisateur
    v_user_id := gen_random_uuid();

    -- Insérer dans auth.users (email confirmé directement)
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmation_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'agent@atlas-incorporate.com',
      crypt('123456789', gen_salt('bf')),
      now(),   -- email_confirmed_at : confirmé immédiatement
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Agent","last_name":"Atlas"}'::jsonb,
      false,
      now(),
      now(),
      now(),
      false,
      null
    );

    RAISE NOTICE 'Utilisateur créé avec ID : %', v_user_id;
  ELSE
    RAISE NOTICE 'Utilisateur déjà existant avec ID : %', v_user_id;
    -- Mettre à jour le mot de passe et confirmer l'email
    UPDATE auth.users
    SET encrypted_password = crypt('123456789', gen_salt('bf')),
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Insérer / mettre à jour le profil avec rôle agent
  INSERT INTO public.user_profiles (
    id, email, first_name, last_name, role, is_active
  ) VALUES (
    v_user_id,
    'agent@atlas-incorporate.com',
    'Agent',
    'Atlas',
    'agent',
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET role      = 'agent',
        is_active = true,
        email     = 'agent@atlas-incorporate.com',
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name  = COALESCE(EXCLUDED.last_name,  user_profiles.last_name);

  RAISE NOTICE 'Profil agent configuré pour : agent@atlas-incorporate.com';
END;
$$;
