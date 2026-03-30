(function () {
  "use strict";

  // ===== DOM References =====
  var loginScreen = document.getElementById("login-screen");
  var positionScreen = document.getElementById("position-screen");
  var quizScreen = document.getElementById("quiz-screen");
  var resultsScreen = document.getElementById("results-screen");
  var coachScreen = document.getElementById("coach-screen");

  var playerNameInput = document.getElementById("player-name");
  var playerPositionSelect = document.getElementById("player-position");
  var rolePlayerBtn = document.getElementById("role-player-btn");
  var roleCoachBtn = document.getElementById("role-coach-btn");
  var loginBtn = document.getElementById("login-btn");
  var logoutBtn = document.getElementById("logout-btn");
  var welcomeMsg = document.getElementById("welcome-msg");

  var questionNumber = document.getElementById("question-number");
  var currentScoreEl = document.getElementById("current-score");
  var questionText = document.getElementById("question-text");
  var optionsContainer = document.getElementById("options-container");
  var explanationText = document.getElementById("explanation-text");
  var nextBtn = document.getElementById("next-btn");
  var difficultyBadge = document.getElementById("difficulty-badge");

  var scoreDisplay = document.getElementById("score-display");
  var percentageDisplay = document.getElementById("percentage-display");
  var tierMessage = document.getElementById("tier-message");
  var missedList = document.getElementById("missed-list");
  var retryBtn = document.getElementById("retry-btn");

  var playersTableBody = document.getElementById("players-table-body");
  var teamAverages = document.getElementById("team-averages");
  var mostMissed = document.getElementById("most-missed");
  var coachBackBtn = document.getElementById("coach-back-btn");

  // ===== State =====
  var allQuestions = [];
  var quizQuestions = [];
  var currentIndex = 0;
  var score = 0;
  var missedQuestions = [];
  var missedIds = [];

  var currentPlayer = null; // { name, positionGroup, role }
  var selectedRole = "player";
  var currentQuizPosition = "";
  var currentQuizTier = "beginner";

  var TIERS = ["beginner", "intermediate", "advanced"];
  var POSITIONS = ["QB", "OL", "WR", "DL", "LB", "DB"];
  var STORAGE_KEY = "fb101_players";

  // ===== localStorage helpers =====
  function loadPlayers() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function savePlayers(players) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }

  function getPlayerData(name) {
    var players = loadPlayers();
    if (!players[name]) {
      players[name] = {
        positionGroup: "",
        quizResults: [],
        tiers: {}
      };
      savePlayers(players);
    }
    return players[name];
  }

  function updatePlayerData(name, data) {
    var players = loadPlayers();
    players[name] = data;
    savePlayers(players);
  }

  function getPlayerTier(name, position) {
    var pd = getPlayerData(name);
    return pd.tiers[position] || "beginner";
  }

  function setPlayerTier(name, position, tier) {
    var pd = getPlayerData(name);
    pd.tiers[position] = tier;
    updatePlayerData(name, pd);
  }

  // ===== Load Questions =====
  function loadQuestions() {
    return fetch("questions.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load questions.json");
        return res.json();
      })
      .then(function (data) {
        allQuestions = data.map(function (q) {
          if (!q.difficulty) q.difficulty = "beginner";
          return q;
        });
      })
      .catch(function (err) {
        console.error(err);
        alert(
          "Could not load questions. Make sure questions.json is in the same folder and you are serving the files from a local server."
        );
      });
  }

  // ===== Utilities =====
  function shuffle(array) {
    var copy = array.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function showScreen(screen) {
    [loginScreen, positionScreen, quizScreen, resultsScreen, coachScreen].forEach(function (s) {
      s.classList.remove("active");
    });
    requestAnimationFrame(function () {
      screen.classList.add("active");
    });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ===== Role Toggle =====
  rolePlayerBtn.addEventListener("click", function () {
    selectedRole = "player";
    rolePlayerBtn.classList.add("role-active");
    roleCoachBtn.classList.remove("role-active");
  });

  roleCoachBtn.addEventListener("click", function () {
    selectedRole = "coach";
    roleCoachBtn.classList.add("role-active");
    rolePlayerBtn.classList.remove("role-active");
  });

  // ===== Login =====
  loginBtn.addEventListener("click", function () {
    var name = playerNameInput.value.trim();
    if (!name) {
      alert("Please enter your name.");
      return;
    }

    var posGroup = playerPositionSelect.value;

    // Ensure player record exists
    var pd = getPlayerData(name);
    pd.positionGroup = posGroup;
    updatePlayerData(name, pd);

    currentPlayer = { name: name, positionGroup: posGroup, role: selectedRole };

    if (selectedRole === "coach") {
      renderCoachDashboard();
      showScreen(coachScreen);
    } else {
      welcomeMsg.textContent = "Welcome, " + name + "! Choose a position group:";
      showScreen(positionScreen);
    }
  });

  // ===== Logout =====
  logoutBtn.addEventListener("click", function () {
    currentPlayer = null;
    playerNameInput.value = "";
    showScreen(loginScreen);
  });

  // ===== Position Selection =====
  document.querySelectorAll(".position-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var position = btn.getAttribute("data-position");
      startQuiz(position);
    });
  });

  // ===== Build quiz with adaptive difficulty + missed-question priority =====
  function buildQuizQuestions(position, tier, playerName) {
    var pd = getPlayerData(playerName);

    // Gather IDs of previously missed questions for this position
    var missedIdSet = {};
    pd.quizResults.forEach(function (r) {
      if (r.position === position && r.missedIds) {
        r.missedIds.forEach(function (id) {
          missedIdSet[id] = true;
        });
      }
    });

    var positionQuestions = allQuestions.filter(function (q) {
      return q.position === position;
    });

    // Prioritize previously missed questions (from appropriate tier)
    var missedPool = positionQuestions.filter(function (q) {
      return missedIdSet[q.id] && q.difficulty === tier;
    });

    // Remaining questions from current tier (not in missed pool)
    var tierPool = positionQuestions.filter(function (q) {
      return q.difficulty === tier && !missedIdSet[q.id];
    });

    // Build: missed first, then tier fill
    var selected = shuffle(missedPool);
    if (selected.length < 10) {
      selected = selected.concat(shuffle(tierPool));
    }

    // If still not enough from this tier, pull from any tier for this position
    if (selected.length < 10) {
      var usedIds = {};
      selected.forEach(function (q) { usedIds[q.id] = true; });
      var fallback = positionQuestions.filter(function (q) {
        return !usedIds[q.id];
      });
      selected = selected.concat(shuffle(fallback));
    }

    return selected.slice(0, 10);
  }

  function startQuiz(position) {
    if (!currentPlayer) return;

    currentQuizPosition = position;
    currentQuizTier = getPlayerTier(currentPlayer.name, position);

    var filtered = allQuestions.filter(function (q) {
      return q.position === position;
    });

    if (filtered.length === 0) {
      alert("No questions found for " + position + ". Check questions.json.");
      return;
    }

    quizQuestions = buildQuizQuestions(position, currentQuizTier, currentPlayer.name);
    currentIndex = 0;
    score = 0;
    missedQuestions = [];
    missedIds = [];

    // Show tier badge
    difficultyBadge.textContent = currentQuizTier.charAt(0).toUpperCase() + currentQuizTier.slice(1);
    difficultyBadge.className = "difficulty-badge tier-" + currentQuizTier;

    showScreen(quizScreen);
    renderQuestion();
  }

  // ===== Render Question =====
  function renderQuestion() {
    var q = quizQuestions[currentIndex];

    questionNumber.textContent =
      "Question " + (currentIndex + 1) + " of " + quizQuestions.length;
    currentScoreEl.textContent = "Score: " + score;
    questionText.textContent = q.question;

    optionsContainer.innerHTML = "";
    explanationText.classList.remove("visible");
    explanationText.textContent = "";
    nextBtn.classList.remove("visible");

    q.options.forEach(function (optionText, index) {
      var btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = optionText;
      btn.addEventListener("click", function () {
        handleAnswer(index);
      });
      optionsContainer.appendChild(btn);
    });
  }

  // ===== Handle Answer =====
  function handleAnswer(selectedIndex) {
    var q = quizQuestions[currentIndex];
    var buttons = optionsContainer.querySelectorAll(".option-btn");

    buttons.forEach(function (btn) {
      btn.disabled = true;
    });

    buttons[q.correctIndex].classList.add("correct");

    if (selectedIndex === q.correctIndex) {
      score++;
    } else {
      buttons[selectedIndex].classList.add("incorrect");

      missedQuestions.push({
        question: q.question,
        yourAnswer: q.options[selectedIndex],
        correctAnswer: q.options[q.correctIndex],
        explanation: q.explanation
      });
      missedIds.push(q.id);
    }

    currentScoreEl.textContent = "Score: " + score;

    explanationText.textContent = q.explanation;
    explanationText.classList.add("visible");

    if (currentIndex < quizQuestions.length - 1) {
      nextBtn.textContent = "Next";
    } else {
      nextBtn.textContent = "See Results";
    }
    nextBtn.classList.add("visible");
  }

  // ===== Next Button =====
  nextBtn.addEventListener("click", function () {
    currentIndex++;
    if (currentIndex < quizQuestions.length) {
      renderQuestion();
    } else {
      finishQuiz();
    }
  });

  // ===== Finish Quiz: save results + adapt tier =====
  function finishQuiz() {
    var total = quizQuestions.length;

    // Save result
    var pd = getPlayerData(currentPlayer.name);
    pd.quizResults.push({
      date: new Date().toISOString(),
      position: currentQuizPosition,
      score: score,
      total: total,
      tier: currentQuizTier,
      missedIds: missedIds
    });

    // Adapt tier
    var tierIdx = TIERS.indexOf(currentQuizTier);
    var newTierIdx = tierIdx;
    if (score >= 8) {
      newTierIdx = Math.min(tierIdx + 1, TIERS.length - 1);
    } else if (score <= 5) {
      newTierIdx = Math.max(tierIdx - 1, 0);
    }
    pd.tiers[currentQuizPosition] = TIERS[newTierIdx];
    updatePlayerData(currentPlayer.name, pd);

    showResults(TIERS[newTierIdx], currentQuizTier);
  }

  // ===== Results =====
  function showResults(newTier, oldTier) {
    var total = quizQuestions.length;
    var pct = Math.round((score / total) * 100);

    scoreDisplay.textContent = score + "/" + total;
    percentageDisplay.textContent = pct + "%";

    // Tier change message
    if (newTier !== oldTier) {
      var direction = TIERS.indexOf(newTier) > TIERS.indexOf(oldTier) ? "up" : "down";
      tierMessage.textContent = "Difficulty moved " + direction + " to " +
        newTier.charAt(0).toUpperCase() + newTier.slice(1) + "!";
      tierMessage.className = "tier-message tier-" + direction;
    } else {
      tierMessage.textContent = "Staying at " +
        newTier.charAt(0).toUpperCase() + newTier.slice(1) + " difficulty.";
      tierMessage.className = "tier-message";
    }

    missedList.innerHTML = "";

    if (missedQuestions.length > 0) {
      var heading = document.createElement("h3");
      heading.textContent = "Review Missed Questions";
      missedList.appendChild(heading);

      missedQuestions.forEach(function (item) {
        var div = document.createElement("div");
        div.className = "missed-item";

        div.innerHTML =
          '<p class="missed-question">' + escapeHtml(item.question) + "</p>" +
          '<p class="missed-your-answer">Your answer: ' + escapeHtml(item.yourAnswer) + "</p>" +
          '<p class="missed-correct">Correct: ' + escapeHtml(item.correctAnswer) + "</p>" +
          '<p class="missed-explanation">' + escapeHtml(item.explanation) + "</p>";

        missedList.appendChild(div);
      });
    }

    showScreen(resultsScreen);
  }

  // ===== Retry =====
  retryBtn.addEventListener("click", function () {
    showScreen(positionScreen);
  });

  // ===== Coach Dashboard =====
  coachBackBtn.addEventListener("click", function () {
    currentPlayer = null;
    playerNameInput.value = "";
    showScreen(loginScreen);
  });

  function renderCoachDashboard() {
    var players = loadPlayers();
    var playerNames = Object.keys(players);

    // -- Player scores table --
    playersTableBody.innerHTML = "";
    playerNames.forEach(function (name) {
      var pd = players[name];
      var row = document.createElement("tr");
      var nameCell = document.createElement("td");
      nameCell.textContent = name;
      row.appendChild(nameCell);

      POSITIONS.forEach(function (pos) {
        var cell = document.createElement("td");
        // Find latest result for this position
        var latest = null;
        if (pd.quizResults) {
          for (var i = pd.quizResults.length - 1; i >= 0; i--) {
            if (pd.quizResults[i].position === pos) {
              latest = pd.quizResults[i];
              break;
            }
          }
        }
        cell.textContent = latest ? latest.score + "/" + latest.total : "-";
        row.appendChild(cell);
      });

      playersTableBody.appendChild(row);
    });

    if (playerNames.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 7;
      emptyCell.textContent = "No player data yet.";
      emptyCell.style.textAlign = "center";
      emptyRow.appendChild(emptyCell);
      playersTableBody.appendChild(emptyRow);
    }

    // -- Team averages --
    teamAverages.innerHTML = "";
    POSITIONS.forEach(function (pos) {
      var scores = [];
      playerNames.forEach(function (name) {
        var pd = players[name];
        if (pd.quizResults) {
          pd.quizResults.forEach(function (r) {
            if (r.position === pos) {
              scores.push(r.score / r.total * 100);
            }
          });
        }
      });

      var avg = scores.length > 0
        ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length)
        : null;

      var card = document.createElement("div");
      card.className = "avg-card";
      card.innerHTML =
        '<div class="avg-pos">' + pos + '</div>' +
        '<div class="avg-value">' + (avg !== null ? avg + "%" : "N/A") + '</div>';

      // Simple bar indicator
      var bar = document.createElement("div");
      bar.className = "avg-bar-track";
      var fill = document.createElement("div");
      fill.className = "avg-bar-fill";
      fill.style.width = (avg !== null ? avg : 0) + "%";
      bar.appendChild(fill);
      card.appendChild(bar);

      teamAverages.appendChild(card);
    });

    // -- Most missed questions --
    mostMissed.innerHTML = "";
    var missCounts = {};
    playerNames.forEach(function (name) {
      var pd = players[name];
      if (pd.quizResults) {
        pd.quizResults.forEach(function (r) {
          if (r.missedIds) {
            r.missedIds.forEach(function (id) {
              missCounts[id] = (missCounts[id] || 0) + 1;
            });
          }
        });
      }
    });

    var missEntries = Object.keys(missCounts).map(function (id) {
      return { id: parseInt(id, 10), count: missCounts[id] };
    });
    missEntries.sort(function (a, b) { return b.count - a.count; });
    missEntries = missEntries.slice(0, 5);

    if (missEntries.length === 0) {
      mostMissed.innerHTML = '<p class="no-data">No missed questions recorded yet.</p>';
    } else {
      missEntries.forEach(function (entry) {
        var q = null;
        for (var i = 0; i < allQuestions.length; i++) {
          if (allQuestions[i].id === entry.id) {
            q = allQuestions[i];
            break;
          }
        }
        var div = document.createElement("div");
        div.className = "missed-entry";
        div.innerHTML =
          '<span class="miss-count">' + entry.count + 'x</span> ' +
          '<span class="miss-text">' + (q ? escapeHtml(q.question) : "Question #" + entry.id) + '</span>';
        mostMissed.appendChild(div);
      });
    }
  }

  // ===== Init =====
  loadQuestions();
})();
