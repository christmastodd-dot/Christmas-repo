(function () {
  "use strict";

  // ===== DOM References =====
  const positionScreen = document.getElementById("position-screen");
  const quizScreen = document.getElementById("quiz-screen");
  const resultsScreen = document.getElementById("results-screen");

  const questionNumber = document.getElementById("question-number");
  const currentScoreEl = document.getElementById("current-score");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const explanationText = document.getElementById("explanation-text");
  const nextBtn = document.getElementById("next-btn");

  const scoreDisplay = document.getElementById("score-display");
  const percentageDisplay = document.getElementById("percentage-display");
  const missedList = document.getElementById("missed-list");
  const retryBtn = document.getElementById("retry-btn");

  // ===== State =====
  let allQuestions = [];
  let quizQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let missedQuestions = [];

  // ===== Load Questions =====
  function loadQuestions() {
    return fetch("questions.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load questions.json");
        return res.json();
      })
      .then(function (data) {
        allQuestions = data;
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
    [positionScreen, quizScreen, resultsScreen].forEach(function (s) {
      s.classList.remove("active");
    });
    // Small delay so the CSS transition plays
    requestAnimationFrame(function () {
      screen.classList.add("active");
    });
  }

  // ===== Position Selection =====
  document.querySelectorAll(".position-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var position = btn.getAttribute("data-position");
      startQuiz(position);
    });
  });

  function startQuiz(position) {
    var filtered = allQuestions.filter(function (q) {
      return q.position === position;
    });

    if (filtered.length === 0) {
      alert("No questions found for " + position + ". Check questions.json.");
      return;
    }

    quizQuestions = shuffle(filtered).slice(0, 10);
    currentIndex = 0;
    score = 0;
    missedQuestions = [];

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

    // Clear previous options
    optionsContainer.innerHTML = "";

    // Hide explanation and next button
    explanationText.classList.remove("visible");
    explanationText.textContent = "";
    nextBtn.classList.remove("visible");

    // Create option buttons
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

    // Disable all buttons
    buttons.forEach(function (btn) {
      btn.disabled = true;
    });

    // Highlight correct answer
    buttons[q.correctIndex].classList.add("correct");

    if (selectedIndex === q.correctIndex) {
      score++;
    } else {
      // Highlight the wrong selection
      buttons[selectedIndex].classList.add("incorrect");

      missedQuestions.push({
        question: q.question,
        yourAnswer: q.options[selectedIndex],
        correctAnswer: q.options[q.correctIndex],
        explanation: q.explanation,
      });
    }

    // Update score display
    currentScoreEl.textContent = "Score: " + score;

    // Show explanation
    explanationText.textContent = q.explanation;
    explanationText.classList.add("visible");

    // Show next button (or finish button on last question)
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
      showResults();
    }
  });

  // ===== Results =====
  function showResults() {
    var total = quizQuestions.length;
    var pct = Math.round((score / total) * 100);

    scoreDisplay.textContent = score + "/" + total;
    percentageDisplay.textContent = pct + "%";

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

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ===== Retry =====
  retryBtn.addEventListener("click", function () {
    showScreen(positionScreen);
  });

  // ===== Init =====
  loadQuestions();
})();
