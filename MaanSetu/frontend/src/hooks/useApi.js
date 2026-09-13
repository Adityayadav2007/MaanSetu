import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small data-fetching hook.
 *
 * Every portal page needs the same three things: the data, whether it is
 * loading, and what went wrong. Doing that by hand in ten pages means ten
 * slightly different race conditions, so it lives here once.
 *
 * @param {() => Promise<T>} loader - returns the data
 * @param {unknown[]} [deps] - refetch when these change
 * @returns {{data: T|null, loading: boolean, error: string|null, refetch: () => void}}
 */
export function useApi(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Guards against setting state from a request that finished after the
  // component unmounted or after a newer request started.
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    Promise.resolve()
      .then(loader)
      .then((result) => {
        if (!mounted.current || id !== requestId.current) return
        setData(result)
      })
      .catch((err) => {
        if (!mounted.current || id !== requestId.current) return
        setError(err.message || 'Something went wrong')
      })
      .finally(() => {
        if (!mounted.current || id !== requestId.current) return
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])

  return { data, loading, error, refetch: run }
}

export default useApi
