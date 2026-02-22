import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

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

const supabase = createClient(
	Deno.env.get('SUPABASE_URL')!,
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
	try {
		const payload: NotificationPayload = await req.json();
		console.log('Received:', payload.type, payload.table);

		if (payload.type !== 'INSERT' || payload.table !== 'Notification') {
			return json({ message: 'Ignored event' });
		}

		const notification = payload.record;
		console.log('Notification for user:', notification.user_id);

		const { data: subscriptions, error } = await supabase
			.from('PushSubscription')
			.select('*')
			.eq('user_id', notification.user_id);

		if (error) {
			console.error('Error fetching subscriptions:', error.message);
			return json({ error: 'Failed to fetch subscriptions' }, 500);
		}

		console.log('Subscriptions found:', subscriptions?.length ?? 0);

		if (!subscriptions || subscriptions.length === 0) {
			return json({ message: 'No subscriptions found' });
		}

		const pushPayload = JSON.stringify({
			notification: {
				title: notification.title,
				body: notification.message,
				icon: '/icons/icon-192x192.png',
				badge: '/icons/icon-72x72.png',
				data: {
					notificationId: notification.id,
					jobId: notification.job_id,
					type: notification.type,
				},
			},
		});

		let successful = 0;
		let failed = 0;

		for (const sub of subscriptions as PushSubscription[]) {
			try {
				console.log('Sending push to subscription:', sub.id);
				const response = await sendWebPush(sub, pushPayload);
				console.log('Push response status:', response.status);

				if (!response.ok) {
					const body = await response.text();
					console.error('Push service error:', response.status, body);
					if (response.status === 404 || response.status === 410) {
						await supabase.from('PushSubscription').delete().eq('id', sub.id);
						console.log('Removed expired subscription:', sub.id);
					}
					failed++;
				} else {
					successful++;
				}
			} catch (err) {
				console.error('Failed to send push:', err);
				failed++;
			}
		}

		console.log('Done - successful:', successful, 'failed:', failed);
		return json({ message: 'Push notifications processed', successful, failed });
	} catch (err) {
		console.error('Unhandled error:', err);
		return json({ error: 'Internal server error' }, 500);
	}
});

// ─── Web Push (RFC 8030 + RFC 8188 + RFC 8291 + RFC 8292) ───────────────────

async function sendWebPush(sub: PushSubscription, payload: string): Promise<Response> {
	const authorization = await buildVapidAuthorization(sub.endpoint);
	const body = await encryptPayload(payload, sub.p256dh, sub.auth);

	return fetch(sub.endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'aes128gcm',
			'TTL': '86400',
			'Authorization': authorization,
		},
		body,
	});
}

// VAPID JWT (RFC 8292)
async function buildVapidAuthorization(endpoint: string): Promise<string> {
	const { protocol, host } = new URL(endpoint);
	const audience = `${protocol}//${host}`;

	const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
	const claims = base64UrlEncode(
		JSON.stringify({
			aud: audience,
			exp: Math.floor(Date.now() / 1000) + 43200,
			sub: VAPID_SUBJECT,
		})
	);
	const unsigned = `${header}.${claims}`;

	// Import VAPID private key as JWK using x,y from the public key
	const pubBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
	const signingKey = await crypto.subtle.importKey(
		'jwk',
		{
			kty: 'EC',
			crv: 'P-256',
			x: base64UrlEncode(pubBytes.slice(1, 33)),
			y: base64UrlEncode(pubBytes.slice(33, 65)),
			d: VAPID_PRIVATE_KEY,
		},
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		signingKey,
		new TextEncoder().encode(unsigned)
	);

	const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
	return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;
}

// Payload encryption (RFC 8291 aes128gcm)
async function encryptPayload(payload: string, p256dh: string, authBase64: string): Promise<Uint8Array> {
	const enc = new TextEncoder();
	const plaintext = enc.encode(payload);

	const uaPubBytes = base64UrlDecode(p256dh);
	const authSecret = base64UrlDecode(authBase64);

	// Ephemeral sender key pair
	const asKeyPair = await crypto.subtle.generateKey(
		{ name: 'ECDH', namedCurve: 'P-256' },
		true,
		['deriveBits']
	);
	const asPubBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));

	// ECDH shared secret
	const uaKey = await crypto.subtle.importKey(
		'raw',
		uaPubBytes,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
	const ecdhSecret = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeyPair.privateKey, 256)
	);

	// IKM per RFC 8291 §3.3
	const keyInfo = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPubBytes, ...asPubBytes]);
	const ikm = await hkdf(ecdhSecret, authSecret, keyInfo, 32);

	// Random salt
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// CEK (16 bytes) and nonce (12 bytes) per RFC 8188
	const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16);
	const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);

	// Pad with 0x02 delimiter (last record)
	const padded = new Uint8Array(plaintext.length + 1);
	padded.set(plaintext);
	padded[plaintext.length] = 0x02;

	// Encrypt
	const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
	);

	// aes128gcm record: salt(16) + rs(4 BE) + keyid_len(1) + as_pub(65) + ciphertext
	const body = new Uint8Array(16 + 4 + 1 + asPubBytes.length + ciphertext.length);
	let i = 0;
	body.set(salt, i); i += 16;
	new DataView(body.buffer).setUint32(i, 4096, false); i += 4;
	body[i++] = asPubBytes.length;
	body.set(asPubBytes, i); i += asPubBytes.length;
	body.set(ciphertext, i);

	return body;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt, info },
		key,
		length * 8
	);
	return new Uint8Array(bits);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64UrlEncode(input: string | Uint8Array): string {
	const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
