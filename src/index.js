import "../assets/styles/styles.css";
import { from, of } from "rxjs";
import { lastValueFrom } from "rxjs";
import { switchMap, catchError, timeout, map } from "rxjs/operators";

document.addEventListener("DOMContentLoaded", () => {
  const gameBoard = document.getElementById("gameBoard");
  const container = document.querySelector(".container");

  let flippedCards = [];
  let startTime, timerInterval;
  let matchedPairs = 0;
  const totalPairs = 6; // Total number of pairs

  // Start the timer when the game starts
  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const now = Date.now();
      const seconds = ((now - startTime) / 1000).toFixed(2);
      document.getElementById("timer").textContent = seconds;
    }, 100);
  }

  // Stop the timer when the game ends
  function stopTimer() {
    clearInterval(timerInterval);
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    updateBestTime(finalTime);
  }

  // Update the best time in local storage
  function updateBestTime(currentTime) {
    const best = localStorage.getItem("bestTime");
    if (!best || parseFloat(currentTime) < parseFloat(best)) {
      localStorage.setItem("bestTime", currentTime);
      document.getElementById("bestTime").textContent = currentTime + "s";
    }
  }

  // Load the best time from local storage
  function loadBestTime() {
    const best = localStorage.getItem("bestTime");
    if (best) {
      document.getElementById("bestTime").textContent = best + "s";
    }
  }

  // Fetch random images from the Picsum API
  function fetchUsers(count = 6) {
    const randomNumber = Math.floor(Math.random() * 100); // Random number for the URL
    const url = `https://picsum.photos/v2/list?page=${randomNumber}&limit=${count}`;
    return from(fetch(url)).pipe(
      switchMap(response => {
        if (!response.ok) throw new Error("❌ Picsum API Error");
        return response.json();
      }),
      timeout({ first: 500 }), // Abort if the request takes more than 0.5 seconds
      map(images => {
        // Duplicate the images to create pairs
        const doubled = [...images, ...images];
        return doubled.sort(() => Math.random() - 0.5); // Shuffle the array
      }),
      catchError(err => {
        hideLoader();
        container.innerHTML = `<p style="color:red;">⚠ ${err.message}</p>`;
        return of([]);
      })
    );
  }

  // Shuffle the array
  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  // Create a card for each image
  function createCard(image) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = image.id; // Use the image ID for matching
    card.innerHTML = `
      <div class="front">❓</div>
      <div class="back"><img src="https://picsum.photos/id/${image.id}/200/300" alt="${image.author}" /></div>
    `;
    card.addEventListener("click", () => flipCard(card));
    return card;
  }

  // Flip a card when clicked
  function flipCard(card) {
    if (card.classList.contains("matched") || card.classList.contains("flipped")) return;

    if (!timerInterval) startTimer(); // Start the timer when the first card is flipped

    card.classList.add("flipped");
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      if (first.dataset.id === second.dataset.id) {
        first.classList.add("matched");
        second.classList.add("matched");
        matchedPairs++;

        if (matchedPairs === totalPairs) {
          stopTimer();
        }
      } else {
        setTimeout(() => {
          first.classList.remove("flipped");
          second.classList.remove("flipped");
        }, 800);
      }
      flippedCards = [];
    }
  }

  // Show the loader while waiting for data
  function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = "block";
    }
  }

  // Hide the loader after data is loaded
  function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = "none";
    }
  }

  // Restart the game
  document.getElementById("restartBtn").addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null; // Stop the timer
    document.getElementById("timer").textContent = "0.00";
    matchedPairs = 0;
    flippedCards = [];
    gameBoard.innerHTML = "";
    startGame();
  });

  // Start the game by fetching images and displaying the cards
  async function startGame() {
    showLoader();
    loadBestTime();
    try {
      const images = await lastValueFrom(fetchUsers(6)); // Fetch 6 random images
      const cards = shuffle(images); // Shuffle the images
      cards.forEach(image => {
        const card = createCard(image);
        gameBoard.appendChild(card); // Append the cards to the game board
      });
    } finally {
      hideLoader(); // Hide the loader when done
    }
  }

  // Initialize the game
  startGame();
});
