import { useEffect, useState } from 'react'

// Jam yang memperbarui dirinya setiap detik. Format 24 jam, contoh: "09.10.15".
export function Time() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('id-ID'))

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID'))
    }, 1000)

    return () => clearInterval(id) // berhenti saat komponen di-unmount
  }, [])

  return <span>{time}</span>
}
