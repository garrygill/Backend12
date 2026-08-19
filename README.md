# AI Job Apply

Finds job postings that match your criteria, uses Claude to tailor a resume
summary and cover letter for each one, and queues them for your review — you
approve or reject each application before anything goes out.

## How it works

1. **PocketBase** (`Dockerfile`) is the backend: auth, and three collections
   (`applicant_profiles`, `job_criteria`, `applications`) defined in
   [`pocketbase/pb_schema.json`](pocketbase/pb_schema.json).
2. **`apply-engine`** is a Node/TypeScript service that:
   - pulls open postings from company job boards via the public
     [Greenhouse](https://developers.greenhouse.io/job-board.html) and
     [Lever](https://github.com/lever/postings-api) job-board APIs,
   - scores each posting against your `job_criteria` (title keywords,
     excluded keywords, location/remote, minimum salary when the posting
     lists a range),
   - calls the Claude API to draft a tailored resume summary and cover
     letter grounded only in your actual base resume (no invented
     experience),
   - saves the result to `applications` with status `pending_review`.
3. You review the queue (`GET /applications?userId=...&status=pending_review`)
   and call `POST /applications/:id/approve` or `/reject`. **Nothing is ever
   sent to an employer automatically** — approval is a required, explicit step.
4. On approval:
   - if the posting listed a public application email, apply-engine emails
     your tailored materials to it and marks the application `submitted`;
   - otherwise it marks the application `manual_required` and hands you the
     direct listing URL to finish the last click yourself.

## Why it doesn't "auto-apply everywhere"

Greenhouse and Lever only publish documented public APIs for *listing* jobs,
not for third-party application *submission* — and sites like LinkedIn or
Indeed don't offer that at all. Rather than driving a headless browser
through someone else's login and application form (fragile, easy to
mis-submit, and likely to violate that site's terms of service), this app
sticks to a submission path that's actually legitimate — direct email to a
posted apply address — and otherwise leaves the final click to you. You can
extend `apply-engine/src/submit.ts` with more submission channels as you
find ones you're comfortable automating.

## Setup

1. **Start PocketBase**: `docker compose up pocketbase` (or `docker build -t pb . && docker run -p 8080:8080 pb`).
2. Open `http://localhost:8080/_/`, create your admin account, then
   **Settings → Import collections** and upload `pocketbase/pb_schema.json`.
   Review the imported fields/rules in the Admin UI afterward — PocketBase's
   import format can vary slightly between versions.
3. Create a normal user account (or sign up via the PocketBase API) and add
   one `applicant_profiles` record and one or more `job_criteria` records
   for that user. Example `job_criteria`:
   ```json
   {
     "user": "<user id>",
     "label": "Senior Backend Engineer, remote",
     "titleKeywords": ["backend engineer", "software engineer"],
     "excludeKeywords": ["intern", "staff"],
     "locations": ["New York", "Remote"],
     "remoteOk": true,
     "salaryMin": 150000,
     "boardTokens": [
       { "board": "greenhouse", "token": "stripe" },
       { "board": "lever", "token": "netflix" }
     ],
     "active": true
   }
   ```
   The board `token` is the company's slug in the job board's public URL,
   e.g. `boards.greenhouse.io/<token>` or `jobs.lever.co/<token>`.
4. **Configure `apply-engine`**: `cd apply-engine && cp .env.example .env`
   and fill in your PocketBase admin credentials and `ANTHROPIC_API_KEY`.
   SMTP settings are optional — without them, matched applications always
   land as `manual_required` instead of being emailed.
5. `npm install && npm run dev` to run the API (`/run`, `/applications`,
   `/applications/:id/approve`, `/applications/:id/reject`), or
   `npm run run-pipeline` to do a one-off scan for every user, useful for a
   cron job. `docker compose up` runs both services together.

## Note on "Claude Code"

The tailoring step calls the **Claude API** (`@anthropic-ai/sdk`) directly —
Claude Code itself is a coding CLI, not something you'd invoke at runtime
inside a production service. If you meant something more specific by "uses
Claude Code," let me know and I can adjust.
