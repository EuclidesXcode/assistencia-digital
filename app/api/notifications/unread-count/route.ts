import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatorio.' }, { status: 400 });
    }

    if (!hasSupabaseAdminConfig) {
      return NextResponse.json({ count: 0 });
    }

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},global.eq.true`)
      .eq('read', false);

    if (error) {
      console.warn('Unread count query error:', error.message);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ count: 0 });
  }
}
