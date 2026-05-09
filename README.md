# Job Aggregator — LinkedIn & Naukri

An [Apify](https://apify.com) actor that scrapes fresh job listings from **LinkedIn** and **Naukri** based on your job role, skills, experience, and location. Only jobs posted within the last 10 days (configurable) are returned, and every result includes a **match score** showing how closely the listing aligns with your required skills.

---

## Features

- Searches **LinkedIn** and **Naukri** in a single run
- Filters jobs posted within a configurable number of days (default: 10)
- Calculates a **match score (0–100)** per job based on skill overlap
- Optionally fetches the **full job description** from each detail page
- Results are deduplicated and sorted by match score
- Residential proxy support to bypass bot detection

---

## Input

All inputs are supplied as JSON. Only `jobRole` and `location` are required — everything else has sensible defaults.

### Full input reference

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `jobRole` | string | Yes | — | Job title to search for, e.g. `"React Developer"` |
| `location` | string | Yes | — | City or region, e.g. `"Bangalore"`, `"Mumbai"`, `"Remote"` |
| `skills` | string[] | No | `[]` | Skills to match against listings. Used to compute the match score |
| `yearsOfExperience` | integer | No | `3` | Years of experience — used to filter Naukri's experience range |
| `maxDaysOld` | integer | No | `10` | Only include jobs posted within this many days (1–30) |
| `jobsPerPortal` | integer | No | `15` | Maximum jobs to collect per portal (5–50) |
| `portals` | string[] | No | `["linkedin","naukri"]` | Which portals to search. Supported values: `linkedin`, `naukri` |
| `useProxy` | boolean | No | `true` | Use Apify residential proxies (strongly recommended) |
| `fetchFullDescription` | boolean | No | `false` | Visit each job's detail page to get the full description. Slower but richer |

### Minimal input example

```json
{
  "jobRole": "React Developer",
  "location": "Bangalore"
}
```

### Full input example

```json
{
  "jobRole": "React Developer",
  "skills": ["React", "TypeScript", "Redux", "Node.js"],
  "yearsOfExperience": 4,
  "location": "Bangalore",
  "maxDaysOld": 7,
  "jobsPerPortal": 15,
  "portals": ["linkedin", "naukri"],
  "useProxy": true,
  "fetchFullDescription": true
}
```

### Input field details

#### `jobRole`
The job title you are searching for. Be specific for better results.

```
"React Developer"
"Senior Python Engineer"
"Data Scientist"
"DevOps Engineer"
"Full Stack Developer"
```

#### `skills`
A list of skills used to compute the **match score**. The actor checks how many of your skills appear in the job title and description, then scores the result from 0 to 100. Output is sorted by this score (highest first).

```json
["React", "TypeScript", "GraphQL", "AWS"]
```

#### `yearsOfExperience`
Used to build the Naukri search URL experience range filter (e.g. `4` years builds a range of `4–7 years`). Does not affect LinkedIn results.

#### `maxDaysOld`
Jobs older than this many days are discarded. LinkedIn uses a time-window filter on the API; Naukri results are filtered by their posted date field.

#### `portals`
Choose which portals to run. Both are enabled by default.

| Value | Portal |
|---|---|
| `"linkedin"` | LinkedIn public guest jobs API |
| `"naukri"` | Naukri.com search results |

#### `fetchFullDescription`
When `false` (default), the actor uses the description snippet visible on the search results page — fast but brief.

When `true`, the actor visits each job's detail page individually to retrieve the complete description. This is slower (roughly 2–5× longer run time) but gives you the full requirements, responsibilities, and company details.

---

## Output

Results are saved to the Apify **Dataset**. Each item represents one job listing.

### Output schema

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (`source-hash`) |
| `title` | string | Job title |
| `company` | string | Company name |
| `location` | string | Job location |
| `description` | string | Snippet or full description (see `fetchFullDescription`) |
| `requiredSkills` | string[] | Skills extracted from the listing (Naukri only) |
| `experience` | string | Experience range as shown on the portal |
| `salary` | string | Salary if displayed (empty when not disclosed) |
| `jobUrl` | string | Direct URL to the job posting |
| `source` | string | `"LinkedIn"` or `"Naukri"` |
| `postedDate` | string | ISO 8601 date the job was posted |
| `postedDaysAgo` | number | Days since posting at the time of scraping |
| `matchScore` | number | 0–100 — percentage of your `skills` found in the listing |
| `scrapedAt` | string | ISO 8601 timestamp of when the data was collected |

### Sample output item

```json
{
  "id": "naukri-a3f9c1d82b04",
  "title": "React Developer",
  "company": "Infosys Limited",
  "location": "Bangalore",
  "description": "We are looking for an experienced React Developer with strong knowledge of TypeScript, Redux and REST APIs...",
  "requiredSkills": ["React", "TypeScript", "Redux", "REST API"],
  "experience": "4-7 years",
  "salary": "12-18 LPA",
  "jobUrl": "https://www.naukri.com/job-listings-react-developer-infosys-bangalore-4-to-7-years-100526009484",
  "source": "Naukri",
  "postedDate": "2026-05-08T00:00:00.000Z",
  "postedDaysAgo": 2,
  "matchScore": 75,
  "scrapedAt": "2026-05-10T09:45:00.000Z"
}
```

---

## Running Locally

### Prerequisites
- Node.js 20 or higher
- An Apify account (for proxy access)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and add your proxy password
cp .env.example .env
```

Edit `.env`:
```
APIFY_PROXY_PASSWORD=your_proxy_password_here
```

Get your proxy password from [console.apify.com/proxy](https://console.apify.com/proxy).

### Configure input

Create or Edit `storage/key_value_stores/default/INPUT.json`:

```json
{
  "jobRole": "React Developer",
  "skills": ["React", "TypeScript", "Redux"],
  "yearsOfExperience": 4,
  "location": "Bangalore",
  "maxDaysOld": 10,
  "jobsPerPortal": 15,
  "portals": ["linkedin", "naukri"],
  "useProxy": true,
  "fetchFullDescription": false
}
```

### Update the package.json scripts

```json
    "scripts": {
    "start": "node dist/main.js",
    "build": "npx tsc",
    "dev": "node --env-file=.env --import tsx/esm src/main.ts"
  }
```

### Run

```bash
npm run dev
```

Results are saved to `storage/datasets/default/`.

### Build for production

```bash
npm run build
npm start
```

---

## Deploying to Apify

### From GitHub (recommended)

1. Push the repository to GitHub
2. Go to [console.apify.com](https://console.apify.com) → **Actors** → **Create new**
3. Connect your GitHub repository
4. Apify will build and deploy automatically on every push to `main`

### Using Apify CLI

```bash
npm install -g apify-cli
apify login
apify push
```

---

## Calling via Apify API

### Run the actor

```bash
curl -X POST \
  "https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "jobRole": "React Developer",
    "skills": ["React", "TypeScript", "Redux"],
    "yearsOfExperience": 4,
    "location": "Bangalore",
    "maxDaysOld": 10,
    "jobsPerPortal": 15,
    "useProxy": true,
    "fetchFullDescription": false
  }'
```

### Fetch results

```bash
curl "https://api.apify.com/v2/actor-runs/RUN_ID/dataset/items" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### JavaScript / Node.js

```js
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });

const run = await client.actor('YOUR_ACTOR_ID').call({
  jobRole: 'React Developer',
  skills: ['React', 'TypeScript', 'Redux'],
  yearsOfExperience: 4,
  location: 'Bangalore',
  maxDaysOld: 10,
  jobsPerPortal: 15,
  useProxy: true,
  fetchFullDescription: false,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

### Python

```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_API_TOKEN")

run = client.actor("YOUR_ACTOR_ID").call(run_input={
    "jobRole": "React Developer",
    "skills": ["React", "TypeScript", "Redux"],
    "yearsOfExperience": 4,
    "location": "Bangalore",
    "maxDaysOld": 10,
    "jobsPerPortal": 15,
    "useProxy": True,
    "fetchFullDescription": False,
})

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)
```

---

## Proxy & Bot Detection

| Portal | Protection | Notes |
|---|---|---|
| LinkedIn | Cloudflare | Uses the unauthenticated guest jobs API — lower risk |
| Naukri | Rate limiting | Residential proxy recommended for bulk runs |

**Residential proxy (`useProxy: true`) is strongly recommended.** Without it, portals may block the scraper after a few requests. On the Apify platform the proxy password is injected automatically — no manual configuration needed.

---

## Project Structure

```
.
├── .actor/
│   ├── actor.json          # Actor metadata
│   └── input_schema.json   # Input form definition for Apify console
├── src/
│   ├── main.ts             # Entry point and crawler orchestration
│   ├── types.ts            # TypeScript interfaces
│   ├── scrapers/
│   │   ├── linkedin.ts     # LinkedIn guest jobs API scraper
│   │   └── naukri.ts       # Naukri search results scraper
│   └── utils/
│       ├── dateParser.ts   # Relative date parsing ("2 days ago" → Date)
│       ├── descriptionFetcher.ts  # Detail page description fetcher
│       ├── helpers.ts      # Match score, dedup, ID generation
│       └── urlBuilder.ts   # Search URL construction per portal
├── .env.example            # Environment variable template
├── Dockerfile              # Apify-compatible container definition
└── package.json
```

---

## License

MIT
