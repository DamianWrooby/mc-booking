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

		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

		const results = await Promise.allSettled(
			(subscriptions as PushSubscription[]).map(async (sub) => {
				try {
					const response = await sendPushNotification(
						{
							endpoint: sub.endpoint,
							keys: {
								p256dh: sub.p256dh,
								auth: sub.auth,
							},
						},
						pushPayload
					);

					if (!response.ok) {
						if (response.status === 404 || response.status === 410) {
							await supabase.from('PushSubscription').delete().eq('id', sub.id);
							console.log(`Removed expired subscription: ${sub.id}`);
						}
						throw new Error(`Push failed with status ${response.status}`);
					}

					return { success: true, subscriptionId: sub.id };
				} catch (err) {
					console.error(`Failed to send to subscription ${sub.id}:`, err);
					return { success: false, subscriptionId: sub.id, error: err };
				}
			})
		);

		const successful = results.filter((r) => r.status === 'fulfilled').length;
		const failed = results.filter((r) => r.status === 'rejected').length;

		return new Response(
			JSON.stringify({
				message: 'Push notifications processed',
				successful,
				failed,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (err) {
		console.error('Error processing webhook:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
});

async function sendPushNotification(
	subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
	payload: string
): Promise<Response> {
	const vapidHeaders = await generateVapidHeaders(
		subscription.endpoint,
		VAPID_SUBJECT,
		VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY
	);

	const encryptedPayload = await encryptPayload(payload, subscription.keys);

	return fetch(subscription.endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'aes128gcm',
			TTL: '86400',
			...vapidHeaders,
		},
		body: encryptedPayload,
	});
}

async function generateVapidHeaders(
	endpoint: string,
	subject: string,
	publicKey: string,
	privateKey: string
): Promise<{ Authorization: string; 'Crypto-Key': string }> {
	const url = new URL(endpoint);
	const audience = `${url.protocol}//${url.host}`;

	const header = { typ: 'JWT', alg: 'ES256' };
	const jwtPayload = {
		aud: audience,
		exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
		sub: subject,
	};

	const jwt = await signJwt(header, jwtPayload, privateKey);

	return {
		Authorization: `vapid t=${jwt}, k=${publicKey}`,
		'Crypto-Key': `p256ecdsa=${publicKey}`,
	};
}

async function signJwt(
	header: object,
	payload: object,
	privateKeyBase64: string
): Promise<string> {
	const encoder = new TextEncoder();

	const headerB64 = base64UrlEncode(JSON.stringify(header));
	const payloadB64 = base64UrlEncode(JSON.stringify(payload));
	const unsignedToken = `${headerB64}.${payloadB64}`;

	const rawKeyBytes = base64UrlDecode(privateKeyBase64);

	// Raw VAPID private key is 32 bytes. Wrap it in PKCS#8 DER structure for P-256.
	// PKCS#8 header for EC P-256 private key (RFC 5958 / RFC 5480)
	const pkcs8Header = new Uint8Array([
		0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
		0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25,
		0x02, 0x01, 0x01, 0x04, 0x20,
	]);
	const pkcs8Key = new Uint8Array(pkcs8Header.length + rawKeyBytes.length);
	pkcs8Key.set(pkcs8Header);
	pkcs8Key.set(rawKeyBytes, pkcs8Header.length);

	const key = await crypto.subtle.importKey(
		'pkcs8',
		pkcs8Key,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		encoder.encode(unsignedToken)
	);

	const signatureB64 = base64UrlEncode(new Uint8Array(signature));

	return `${unsignedToken}.${signatureB64}`;
}

async function encryptPayload(
	payload: string,
	keys: { p256dh: string; auth: string }
): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const payloadBytes = encoder.encode(payload);

	const userPublicKey = base64UrlDecode(keys.p256dh);
	const userAuth = base64UrlDecode(keys.auth);

	const localKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits',
	]);

	const localPublicKey = await crypto.subtle.exportKey('raw', localKeys.publicKey);

	const userKey = await crypto.subtle.importKey(
		'raw',
		userPublicKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);

	const sharedSecret = await crypto.subtle.deriveBits(
		{ name: 'ECDH', public: userKey },
		localKeys.privateKey,
		256
	);

	const salt = crypto.getRandomValues(new Uint8Array(16));

	const prk = await hkdf(
		new Uint8Array(sharedSecret),
		userAuth,
		encoder.encode('Content-Encoding: auth\0')
	);

	const contentEncryptionKey = await hkdf(
		prk,
		salt,
		createInfo('aesgcm', new Uint8Array(userPublicKey), new Uint8Array(localPublicKey))
	);

	const nonce = await hkdf(
		prk,
		salt,
		createInfo('nonce', new Uint8Array(userPublicKey), new Uint8Array(localPublicKey))
	);

	const paddedPayload = new Uint8Array(payloadBytes.length + 2);
	paddedPayload[0] = 0;
	paddedPayload[1] = 0;
	paddedPayload.set(payloadBytes, 2);

	const key = await crypto.subtle.importKey('raw', contentEncryptionKey.slice(0, 16), 'AES-GCM', false, [
		'encrypt',
	]);

	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce.slice(0, 12) },
		key,
		paddedPayload
	);

	const recordSize = 4096;
	const header = new Uint8Array(21 + localPublicKey.byteLength);
	header.set(salt, 0);
	new DataView(header.buffer).setUint32(16, recordSize, false);
	header[20] = localPublicKey.byteLength;
	header.set(new Uint8Array(localPublicKey), 21);

	const result = new Uint8Array(header.length + encrypted.byteLength);
	result.set(header, 0);
	result.set(new Uint8Array(encrypted), header.length);

	return result;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt,
			info,
		},
		key,
		256
	);

	return new Uint8Array(bits);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
	const encoder = new TextEncoder();
	const typeBytes = encoder.encode(`Content-Encoding: ${type}\0`);
	const p256Bytes = encoder.encode('P-256\0');

	const info = new Uint8Array(
		typeBytes.length + p256Bytes.length + 2 + clientPublicKey.length + 2 + serverPublicKey.length
	);

	let offset = 0;
	info.set(typeBytes, offset);
	offset += typeBytes.length;
	info.set(p256Bytes, offset);
	offset += p256Bytes.length;
	info[offset++] = 0;
	info[offset++] = clientPublicKey.length;
	info.set(clientPublicKey, offset);
	offset += clientPublicKey.length;
	info[offset++] = 0;
	info[offset++] = serverPublicKey.length;
	info.set(serverPublicKey, offset);

	return info;
}

function base64UrlEncode(input: string | Uint8Array): string {
	const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
