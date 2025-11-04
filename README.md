# MyMusicCity
This repo contains the code for our website, MyMusicCity.

Trello board: trello.com/w/mymusiccity

Project Timeline (Agile framework with weekly meetings)

Sprint 1 – by 25 September 
- Set up Tech stack (MERN)  
- GitHub repository set up for monitoring and logging 
- Make significant progress on UX skeleton: creating pages, setting up functionality

Sprint 2 – by 21 October 
- The big-ticket item here is implementing web scraping to gather the concert data
- Progress on UX, including redirect links for maps and events created
- Vanderbilt verification set up – using email, not SSO

Sprint 3 – by 11 November 
- UI design 
- Leave room for tackling unforeseen obstacles/developments

Final Product and Presentation – 2 December 
- We will develop a slide deck prepared to give a professional presentation on MyMusicCity, what it accomplishes and why people should care. 
- We will have a video presentation prepared of a user navigating and making use of MyMusicCity, as well as perform a live demonstration 

Team members:
Emma Chang emma.j.chang@vanderbilt.edu
Annette Ma annette.l.ma@vanderbilt.edu
Jake Seals jake.d.seals@vanderbilt.edu

## Scraper scheduling (every-other-night)

The scrapers are intended to run automatically every other night and update the `Event` collection in MongoDB.

Two options are provided; pick one depending on where you host the repository:

- GitHub Actions (recommended for a small class project):
	- The repo includes a workflow `.github/workflows/scrape.yml` which runs `npm run scrape:all` on the schedule `0 3 */2 * *` (every 2 days at 03:00 UTC).
	- Before the workflow can successfully connect to your database, add a repository Secret named `MONGO_URI` containing your MongoDB connection string (do NOT commit `.env` to the repo).
	- If you need debug output for a particular run, set a repository secret `DEBUG_SCRAPE=1` (not recommended for regular runs).

- Render / Hosted scheduler: If you host the backend on Render, create a Scheduled Job that runs the command `node server/scraping/scrapeAll.js` on the same schedule and set the environment variable `MONGO_URI` in the Render dashboard.

Verification steps after deployment:
1. Confirm the GitHub Actions run appears in Actions → Scheduled Scrape and completes successfully.
2. Check the backend API `/api/events` to see new entries after a scheduled run.
3. If Puppeteer fails to launch on the hosted runner, use a Docker-based Render job or adjust the runner environment (we can provide a Dockerfile if needed).

Security notes:
- Do not commit your `.env` or database credentials to the repository.
- Use repo secrets (GitHub) or platform env vars (Render) to store `MONGO_URI`.

