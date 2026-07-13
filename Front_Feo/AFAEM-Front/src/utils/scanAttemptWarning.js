export const SCAN_WARNING_MESSAGE = 'Has escaneado 2 veces tu documento. Verifica que esté bien.';

export async function registerSuccessfulScanAttempt({ attemptsRef, scanKey, Swal }) {
  if (!attemptsRef?.current || !scanKey || !Swal?.fire) return;

  const nextCount = (attemptsRef.current[scanKey] || 0) + 1;
  attemptsRef.current[scanKey] = nextCount;

  if (nextCount === 2) {
    await Swal.fire({
      title: 'Aviso',
      text: SCAN_WARNING_MESSAGE,
      icon: 'info',
      timer: 2600,
      showConfirmButton: false
    });
  }
}
