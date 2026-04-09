-- ============================================================
-- Migração: Bootstrap do usuário administrador
--
-- Cria o usuário administrativo@avizee.com.br em auth.users
-- (caso não exista) com senha padrão, e garante que ele tenha
-- a role 'admin' em user_roles e role_padrao = 'admin' no perfil.
--
-- Senha padrão: Avizee@2026!
-- (altere imediatamente em produção via dashboard do Supabase)
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT := 'administrativo@avizee.com.br';
BEGIN
  -- Verifica se o usuário já existe em auth.users pelo e-mail
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    -- Cria o usuário no Supabase Auth com e-mail confirmado
    v_admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt('Avizee@2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"Administrativo AviZee"}'::jsonb,
      now(),
      now(),
      '',
      '',
      false
    );
    -- O trigger on_auth_user_created criará o perfil
    -- e atribuirá a role 'vendedor' automaticamente.
  END IF;

  -- Garante que o perfil existe e tem role_padrao = 'admin'
  INSERT INTO public.profiles (id, nome, email, role_padrao)
  VALUES (
    v_admin_id,
    'Administrativo AviZee',
    v_admin_email,
    'admin'::app_role
  )
  ON CONFLICT (id) DO UPDATE
    SET role_padrao = 'admin'::app_role,
        nome = CASE
          WHEN public.profiles.nome = '' OR public.profiles.nome = v_admin_email
          THEN 'Administrativo AviZee'
          ELSE public.profiles.nome
        END;

  -- Garante que o usuário tem a role 'admin' em user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
