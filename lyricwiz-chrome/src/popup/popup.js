document.addEventListener("DOMContentLoaded", async () => {
  const titleElement = document.getElementById("website-title");
  const genius_api_input = document.getElementById("genius-api-input");
  const save_api_button = document.getElementById("save-api-button");
  const lyricsElement1 = document.getElementById("lyrics-container-1");
  const lyricsElement2 = document.getElementById("lyrics-container-2");
  const songIdElement = document.getElementById("songid-container");

  titleElement.classList.add('loading');
  const storedApiKey = localStorage.getItem("genius_api_key");
  genius_api_input.value = storedApiKey || "";

  const fetchLyrics = async (title) => {
    const genius_api_key = localStorage.getItem("genius_api_key");
    console.log("Using API Key:", genius_api_key);
    console.log("Fetching lyrics for title:", title);

    const url = `https://api.genius.com/search?q=${encodeURIComponent(title)}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${genius_api_key}`
        }
      });

      const data = await response.json();
      console.log("Fetched Lyrics Data:", data);
      return data;
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return null;
    }
  };

  const fetchSongDetails = async (songId) => {
    const genius_api_key = localStorage.getItem("genius_api_key");
    const url = `https://api.genius.com/songs/${songId}`;

    console.log("Fetching song details for ID:", songId);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${genius_api_key}`
        }
      });

      const data = await response.json();
      console.log("Fetched Song Details:", data);
      return data;
    } catch (error) {
      console.error("Error fetching song details:", error);
      return null;
    }
  };

  const scrapeLyricsFromGenius = async (geniusUrl) => {
    console.log("Fetching Genius page:", geniusUrl);

    try {
        const response = await fetch(geniusUrl);
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const lyricsDiv = doc.querySelector('div[data-lyrics-container="true"]');

        if (!lyricsDiv) {
            console.warn("Lyrics not found on Genius page.");
            return "Lyrics not available.";
        }

        return lyricsDiv.innerText.trim();
    } catch (error) {
        console.error("Error scraping lyrics:", error);
        return "Failed to load lyrics.";
    }
};

  save_api_button.addEventListener('mousedown', function (e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');
    this.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });

  save_api_button.addEventListener("click", () => {
    localStorage.setItem("genius_api_key", genius_api_input.value);
    console.log("Saved API Key:", genius_api_input.value);

    save_api_button.classList.add('saved');
    setTimeout(() => {
      save_api_button.classList.remove('saved');
    }, 1500);
  });

  try {
    // Get current tab title
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const title = tab.title || "No title found";
    const cleanTitle = title.split(" - ")[0].trim();

    titleElement.innerText = cleanTitle;
    console.log("Detected song title:", cleanTitle);

    // Remove loading state after a delay for animation effect
    setTimeout(() => {
      titleElement.classList.remove('loading');
    }, 800);

    const data = await fetchLyrics(cleanTitle);
    if (!data || !data.response.hits.length) {
      console.warn("No song found for:", cleanTitle);
      lyricsElement1.innerHTML = `
        <div class="no-lyrics-found">
          <span class="no-lyrics-icon">🔍</span>
          <p>No lyrics found for "${cleanTitle}"</p>
        </div>
      `;
      return;
    }

    const songId = data.response.hits[0].result.id;
    songIdElement.innerHTML = `<span class="song-id-label">Song ID:</span> ${songId}`;
    songIdElement.classList.add('song-id-animate');
    console.log("Fetched Song ID:", songId);

    const songData = await fetchSongDetails(songId);
    if (!songData || !songData.response.song) {
      console.warn("Song details not available.");
      return;
    }

    const { url: lyricUrl, primary_artist, title: songTitle } = songData.response.song;
    const songArtist = primary_artist.name;

    lyricsElement1.innerHTML = `
      <div class="song-header">
        <h2 class="song-title">${songTitle}</h2>
        <h3 class="song-artist">by ${songArtist}</h3>
      </div>
    `;

    lyricsElement1.innerHTML += `<div class="lyrics-content loading"></div>`;

    // Add genius button with animation classes
    lyricsElement2.innerHTML = `
      <a href="${lyricUrl}" target="_blank" class="genius-link"> 
        <button class="genius-button">View on Genius</button> 
      </a>
    `;

    console.log("Lyrics URL:", lyricUrl);

    // Scrape lyrics from Genius page
    const scrapedLyrics = await scrapeLyricsFromGenius(lyricUrl);


    const formattedLyrics = scrapedLyrics
      .replace(/\n\n/g, "<br><br>")  // Double line breaks for verse separation
      .replace(/, /g, ",<br><br><br>")       // New line after commas
      .replace(/\. /g, ".<br><br><br>")      // New line after periods
      .replace(/\n/g, "<br><br><br>");       // Single line breaks

    const lyricsContent = lyricsElement1.querySelector('.lyrics-content');

    titleElement.innerText = "🎶LyricWiz🎵";

    setTimeout(() => {
      lyricsContent.classList.remove('loading');
      lyricsContent.innerHTML = formattedLyrics;
      lyricsContent.classList.add('lyrics-reveal');

      addMusicNoteDecorations(lyricsContent);
    }, 800);

  } catch (error) {
    console.error("Error in main execution:", error);
    lyricsElement1.innerHTML = `
      <div class="error-message">
        <span class="error-icon">❌</span>
        <p>Something went wrong. Please try again.</p>
        <small>${error.message}</small>
      </div>
    `;
  }

  function addMusicNoteDecorations(lyricsContainer) {
    const musicNotes = ['♪', '♫', '🎵', '🎶'];
    const numNotes = 3;

    for (let i = 0; i < numNotes; i++) {
      const note = document.createElement('span');
      note.textContent = musicNotes[Math.floor(Math.random() * musicNotes.length)];
      note.classList.add('floating-music-note');

      note.style.top = `${10 + Math.random() * 80}%`;
      note.style.right = `${5 + Math.random() * 15}%`;
      note.style.animationDelay = `${i * 0.5}s`;
      note.style.opacity = '0.15';

      lyricsContainer.appendChild(note);
    }
  }
});