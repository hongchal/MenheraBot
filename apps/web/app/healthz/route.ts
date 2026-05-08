// Liveness/readiness probe endpoint. Kept lightweight and dependency-free
// so the kubelet probe stays fast.
export const dynamic = 'force-static';

export function GET() {
  return new Response('ok\n', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
