
-- Atomic add_coins function
CREATE OR REPLACE FUNCTION public.add_coins(
  p_user_id UUID,
  p_user_role TEXT,
  p_amount INT,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance INT;
  v_table TEXT;
BEGIN
  -- Validate caller is the user or an admin
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Determine table
  v_table := CASE p_user_role
    WHEN 'coach' THEN 'coaches'
    WHEN 'parent' THEN 'parents'
    WHEN 'student' THEN 'students'
    WHEN 'pro_athlete' THEN 'pro_athletes'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_user_role;
  END IF;

  -- Atomic update
  EXECUTE format(
    'UPDATE %I SET coin_balance = COALESCE(coin_balance, 0) + $1 WHERE id = $2 RETURNING coin_balance',
    v_table
  ) INTO v_new_balance USING p_amount, p_user_id;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found in % table', v_table;
  END IF;

  -- Record transaction
  INSERT INTO coin_transactions (user_id, user_role, amount, transaction_type, balance_after, description, reference_id)
  VALUES (p_user_id, p_user_role, p_amount, p_type, v_new_balance, p_description, p_reference_id);

  RETURN v_new_balance;
END;
$$;

-- Atomic spend_coins function with row-level locking
CREATE OR REPLACE FUNCTION public.spend_coins(
  p_user_id UUID,
  p_user_role TEXT,
  p_amount INT,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_table TEXT;
BEGIN
  -- Validate caller
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  v_table := CASE p_user_role
    WHEN 'coach' THEN 'coaches'
    WHEN 'parent' THEN 'parents'
    WHEN 'student' THEN 'students'
    WHEN 'pro_athlete' THEN 'pro_athletes'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_user_role;
  END IF;

  -- Lock the row and check balance atomically
  EXECUTE format(
    'SELECT coin_balance FROM %I WHERE id = $1 FOR UPDATE',
    v_table
  ) INTO v_current_balance USING p_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found in % table', v_table;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  v_new_balance := v_current_balance - p_amount;

  EXECUTE format(
    'UPDATE %I SET coin_balance = $1 WHERE id = $2',
    v_table
  ) USING v_new_balance, p_user_id;

  INSERT INTO coin_transactions (user_id, user_role, amount, transaction_type, balance_after, description, reference_id)
  VALUES (p_user_id, p_user_role, -p_amount, p_type, v_new_balance, p_description, p_reference_id);

  RETURN v_new_balance;
END;
$$;
