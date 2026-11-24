import { admin } from '@/lib/server';
export const dynamic = 'force-dynamic';

/** Lets a member delete their own account. Cascades remove everything linked to them. */
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) return new Response('Unauthorized', { status: 401 });
  const sb = admin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return new Response('Unauthorized', { status: 401 });
  const { error: delErr } = await sb.auth.admin.deleteUser(data.user.id);
  if (delErr) return new Response('Could not delete', { status: 500 });
  return Response.json({ ok: true });
}
