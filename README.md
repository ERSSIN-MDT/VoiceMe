# VoiceMe

VoiceMe is a tiny, two-person, audio-only WebRTC call site. There are no accounts, recordings, analytics, or media servers in the application path.

## Architecture

- **Client:** static vanilla HTML, CSS, and ES modules, served from Vercel's CDN. It only requests microphone audio and renders a small, fixed DOM.
- **Media:** WebRTC transports Opus audio directly between peers. DTLS-SRTP encrypts the call end-to-end in transit; VoiceMe never receives audio.
- **Signaling:** Vercel Functions use Upstash Redis REST as a short-lived room registry and message mailbox. Polling occurs only while a room is open and carries SDP/ICE metadata, never voice.
- **NAT traversal:** configure a managed TURN service in `ICE_SERVERS`. TURN relays encrypted WebRTC packets only when a direct path cannot be created. Vercel cannot be a TURN server and serverless functions cannot reliably host persistent WebSockets.

This is the lightest practical serverless deployment: there is no persistent application server, but reliable worldwide calling necessarily needs STUN/TURN infrastructure. Use a TURN provider with time-limited credentials in production; exposing permanent TURN credentials to browsers is unsafe.

## Deploy

1. Create an Upstash Redis database and add its REST URL/token to Vercel environment variables.
2. Add `ICE_SERVERS` as a valid JSON array from your TURN provider.
3. Run `npm i -g vercel` if needed, then `vercel --prod`.

## Local development

Copy `.env.example` to `.env.local`, fill in the values, then run `npm run dev`. This integrated server listens on `http://localhost:8000` and supports the API routes; a static server such as `python -m http.server` cannot handle signaling requests.

Rooms and signaling expire automatically. Redis is used only for room membership and transient WebRTC negotiation messages.
