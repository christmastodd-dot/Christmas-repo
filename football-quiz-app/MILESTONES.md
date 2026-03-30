# Football 101 Quiz App — Development Milestones

A position-specific quiz app for HS freshmen football players. Covers six position groups: DL, LB, DB, WR, QB, and OL. Quizzes are delivered in 10-question increments and assume players have some playing/watching experience but need to sharpen their football IQ.

---

## Milestone 1: Core Quiz Engine & Question Bank

**Goal:** Build a working quiz that can serve 10 questions, score them, and display results.

### Deliverables
- Data model for questions (question text, multiple-choice options, correct answer, explanation, position group, difficulty tag)
- Question bank with 10 starter questions per position group (60 questions total)
- Quiz engine that:
  - Lets the player select a position group
  - Serves 10 randomized questions from that group
  - Accepts answers and tracks score
  - Shows a results summary with correct/incorrect breakdown and explanations
- Simple command-line or single-page interface to run through a quiz

### Question Topics by Position
| Group | Sample Topics |
|-------|--------------|
| **QB** | Pre-snap reads, cadence, progression reads, play-action fundamentals, audible situations |
| **OL** | Blocking schemes (zone/gap), pass protection rules, combo blocks, pulling, recognizing blitzes |
| **WR** | Route tree basics, release techniques, option routes, blocking assignments, signal communication |
| **DL** | Alignment/technique numbers, gap responsibilities, pass rush moves, reading the offensive line |
| **LB** | Run fit assignments, zone vs man coverage basics, blitz responsibilities, key reads, pursuit angles |
| **DB** | Coverage shell basics (Cover 1/2/3/4), backpedal technique cues, zone landmarks, tackling in space |

---

## Milestone 2: Scoring, Progress Tracking & Adaptive Difficulty

**Goal:** Give coaches visibility into player knowledge and make the quiz smarter over time.

### Deliverables
- Player profiles (name, position group, grad year)
- Persistent score history per player per position group
- Dashboard for coaches showing:
  - Individual player scores and trends
  - Team-wide averages by position group
  - Most-missed questions across the roster
- Adaptive question selection:
  - Tag questions as Beginner / Intermediate / Advanced
  - Start new players at Beginner; promote based on score thresholds (e.g., 8/10 → next tier)
  - Re-serve missed questions in future quizzes until mastered
- Expand question bank to 20 questions per position group per difficulty tier (360 total)

---

## Milestone 3: Game-Week Integration & Multimedia

**Goal:** Make the app a weekly coaching tool tied to the upcoming opponent and real film.

### Deliverables
- **Game-week custom quizzes:** Coaches can create a 10-question quiz tied to that week's scouting report (e.g., "What coverage do we check to vs. their trips formation?")
- **Image/diagram support:** Attach formation diagrams, whiteboard drawings, or film screenshots to questions
- **Video clip questions:** Embed short film clips (5-10 sec) and ask "What is the correct read here?"
- **Timed challenge mode:** Optional 30-second-per-question mode for competitive reps
- **Leaderboard & badges:** Weekly position-group leaderboards and milestone badges (e.g., "Perfect Score", "10-Quiz Streak") to drive engagement
- **Notifications:** Push reminders for incomplete game-week quizzes before Friday

---

## Tech Considerations (to finalize before Milestone 1 kickoff)
- **Platform:** Web app (mobile-friendly) vs. native mobile — web recommended for easiest access on school devices
- **Stack candidates:** React or Next.js frontend, Python/Node backend, SQLite or PostgreSQL for data
- **Auth:** Simple coach-created roster with join codes (no emails needed for minors)
- **Hosting:** Low-cost options like Vercel/Railway to keep budget manageable for a HS program
