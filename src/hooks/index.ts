// Custom hooks for common app patterns
// Extracts reusable logic from components

import { useState, useCallback } from 'react';

/**
 * Hook for handling form input state with validation
 */
export function useFormField<T>(
  initialValue: T,
  validator?: (value: T) => string | null
) {
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    if (touched && validator) {
      setError(validator(newValue));
    }
  }, [touched, validator]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validator) {
      setError(validator(value));
    }
  }, [value, validator]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  const validate = useCallback((): boolean => {
    if (validator) {
      const validationError = validator(value);
      setError(validationError);
      setTouched(true);
      return validationError === null;
    }
    return true;
  }, [value, validator]);

  return {
    value,
    error,
    touched,
    handleChange,
    handleBlur,
    reset,
    validate,
    isValid: error === null,
  };
}

/**
 * Hook for numeric input (VND amounts)
 */
export function useAmountInput(initialValue: number = 0) {
  const [rawValue, setRawValue] = useState(
    initialValue > 0 ? String(initialValue) : ''
  );

  const handleChange = useCallback((text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '');
    setRawValue(digits);
  }, []);

  const numericValue = rawValue ? parseInt(rawValue, 10) : 0;

  const reset = useCallback(() => {
    setRawValue('');
  }, []);

  return {
    rawValue,
    numericValue,
    handleChange,
    reset,
    isValid: numericValue > 0,
  };
}

/**
 * Hook for loading states with error handling
 */
export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * Hook for toggle state
 */
export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse, setValue };
}
