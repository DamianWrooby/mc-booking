import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface NotificationPayload {
	type: 'INSERT';
	table: string;
	record: {
		id: string;
		user_id: string;
		title: string;
		message: string;
		type: string;
		job_id: string | null;
		is_read: boolean;
		created_at: string;
	};
	schema: string;
}

interface PushSubscription {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
}

Deno.serve(async (req) => {
	try {
		const payload: NotificationPayload = await req.json();

		if (payload.type !== 'INSERT' || payload.table !== 'Notification') {
			return new Response(JSON.stringify({ message: 'Ignored event' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const notification = payload.record;

		const supabase = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		const { data: subscriptions, error } = await supabase
			.from('PushSubscription')
			.select('*')
			.eq('user_id', notification.user_id);

		if (error) {
			console.error('Error fetching subscriptions:', error);
			return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!subscriptions || subscriptions.length === 0) {
			console.log('No subscriptions found for user:', notification.user_id);
			return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const pushPayload = JSON.stringify({
			title: notification.title,
			body: notification.message,
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-72x72.png',
			data: {
				notificationId: notification.id,
				jobId: notification.job_id,
				type: notification.type,
			},
		});

		let successful = 0;
		let failed = 0;

		for (const sub of subscriptions as PushSubscription[]) {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth,
						},
					},
					pushPayload
				);
				successful++;
				console.log(`Push sent to subscription: ${sub.id}`);
			} catch (err: unknown) {
				failed++;
				console.error(`Failed to send to subscription ${sub.id}:`, err);

				// Remove expired/invalid subscriptions
				const status = (err as { statusCode?: number })?.statusCode;
				if (status === 404 || status === 410) {
					await supabase.from('PushSubscription').delete().eq('id', sub.id);
					console.log(`Removed expired subscription: ${sub.id}`);
				}
			}
		}

		return new Response(
			JSON.stringify({ message: 'Push notifications processed', successful, failed }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Error processing webhook:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
});
