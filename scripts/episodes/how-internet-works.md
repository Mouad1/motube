# How the Internet Works — Pilot Episode Script

**Format:** KarpathyEpisode (7 scenes, ~90s)  
**Target audience:** Tech-curious beginners  
**Pipeline:** `scripts/episodes/how-internet-works.json` → render → output MP4

---

## Scene 1 — Title Card (5s)

**Visual:** Dark background, title fades in  
**Narration:**  
> Every time you open a website, send a message, or stream a video, a small miracle of engineering happens in milliseconds. Let's break it down.

---

## Scene 2 — Bullet Points: The Internet in 5 ideas (10s)

**Visual:** 5 bullets appear staggered  
- 📦 Packets — data is split into small chunks  
- 🔢 IP addresses — every device has a unique number  
- 🗺️ Routers — traffic directors of the Internet  
- 📖 DNS — the phone book that translates names to IPs  
- 📜 TCP/IP — the rules that make it reliable  

**Narration:**  
> The Internet is built on five simple ideas. Master these, and the rest falls into place.

---

## Scene 3 — Diagram: A request travels the world (12s)

**Visual:** Animated flow: Browser → Router → ISP → DNS Server + Web Server  
**Nodes:** Browser (green), Router (blue), ISP (amber), DNS (purple), Web Server (red)  
**Caption:** Each hop adds ~1-10ms. London to New York: ~80ms.

**Narration:**  
> When you type a URL, your request jumps through several hops before reaching its destination. Each hop is handled by a specialized piece of infrastructure.

---

## Scene 4 — Concept: Packets, the postal system (8s)

**Heading:** Packets: the postal system of data  
**Body:** Your browser doesn't send one big blob. It breaks data into packets of ~1500 bytes each — numbered, addressed, and sent independently. They may take different routes and arrive out of order. TCP reassembles them perfectly.

**Narration:**  
> Think of it like shipping a large painting by cutting it into puzzle pieces, mailing each separately, and reassembling on arrival. That's exactly what TCP/IP does with your data.

---

## Scene 5 — Code Walkthrough: DNS in 3 steps (14s)

**Language:** JavaScript (Node.js)  
**Steps:**

1. **Lines 1-2** — Import DNS module from Node stdlib  
   > We import Node's built-in DNS resolver — no library needed. DNS is so fundamental it's in the standard library.

2. **Lines 4-6** — Call `dns.resolve4(hostname)`  
   > We ask: 'What IP address belongs to google.com?' The OS queries a DNS server (usually your ISP's or Google's 8.8.8.8).

3. **Lines 9-10** — Result: an IP address  
   > The result: an IP address. '142.250.185.46' is one of Google's IPs. Your request now knows where to go.

**Narration:**  
> DNS is the phone book of the Internet. It translates human-readable domain names into the IP addresses that routers actually understand.

---

## Scene 6 — Concept: TCP the reliable postman (8s)

**Heading:** TCP: the reliable postman  
**Body:** TCP guarantees delivery. It numbers packets, detects lost ones, and requests retransmission. The tradeoff: overhead. UDP skips that — used for games and video calls.

**Narration:**  
> Reliability comes at a cost. TCP adds handshakes and acknowledgements — perfect for web pages. But when you're on a video call, a slightly garbled frame is better than a delayed one. That's why Zoom uses UDP, not TCP.

---

## Scene 7 — Transition: Outro (4s)

**Visual:** Centered text fade-in  
**Text:** "The Internet: simple ideas, extraordinary scale."

**Narration:**  
> Billions of devices. Millions of kilometers of fiber. Trillions of packets per day. All running on ideas from the 1970s — proof that great fundamentals last forever.

---

## Pipeline notes

- All scenes include `narration` field ready for ElevenLabs TTS
- `diagram` scene uses new `DiagramScene` component (MOT-5)
- `bullet_points` uses new `BulletPointScene` (MOT-5)
- `code_walkthrough` uses new `CodeWalkthrough` (MOT-5)
- Render command: `npx tsx pipeline/render.ts --episode-id <id> --quality preview`
