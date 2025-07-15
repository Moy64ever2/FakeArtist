import express from 'express';
import cors from 'cors';
import { networkInterfaces } from 'os';

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Fake Artist Game Server...');
console.log('📍 Port:', PORT);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');

// Enhanced CORS configuration for production
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow your Netlify domain and localhost for development
    const allowedOrigins = [
      'https://voluble-fairy-0163e8.netlify.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    // In development, allow any origin
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Game categories and utilities
const CATEGORIES = {
  animals: [
    'Cat', 'Dog', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Monkey', 'Giraffe', 
    'Zebra', 'Penguin', 'Dolphin', 'Shark', 'Eagle', 'Owl', 'Butterfly', 
    'Spider', 'Ant', 'Bee', 'Rabbit', 'Fox', 'Wolf', 'Deer', 'Horse', 'Cow'
  ],
  'famous-people': [
    'Einstein', 'Leonardo da Vinci', 'Napoleon', 'Cleopatra', 'Shakespeare', 
    'Mozart', 'Beethoven', 'Picasso', 'Gandhi', 'Lincoln', 'Washington', 
    'Churchill', 'Tesla', 'Edison', 'Jobs', 'Gates', 'Chaplin', 'Monroe'
  ],
  movies: [
    'Titanic', 'Avatar', 'Star Wars', 'Batman', 'Superman', 'Spider-Man', 
    'Iron Man', 'Avengers', 'Frozen', 'Shrek', 'Toy Story', 'Finding Nemo', 
    'The Lion King', 'Jurassic Park', 'E.T.', 'Jaws', 'Rocky', 'Terminator'
  ],
  countries: [
    'France', 'Italy', 'Japan', 'Brazil', 'Australia', 'Canada', 'Germany', 
    'Russia', 'India', 'China', 'Mexico', 'Egypt', 'Greece', 'Spain', 
    'Norway', 'Sweden', 'Netherlands', 'Switzerland', 'Argentina', 'Chile'
  ],
  food: [
    'Pizza', 'Burger', 'Sushi', 'Pasta', 'Sandwich', 'Salad', 'Cake', 
    'Ice Cream', 'Donut', 'Cookie', 'Apple', 'Banana', 'Orange', 'Grape', 
    'Strawberry', 'Chocolate', 'Cheese', 'Bread', 'Rice', 'Chicken'
  ],
  objects: [
    'Car', 'House', 'Tree', 'Flower', 'Sun', 'Moon', 'Star', 'Cloud', 
    'Mountain', 'River', 'Bridge', 'Castle', 'Tower', 'Clock', 'Phone', 
    'Computer', 'Book', 'Pen', 'Chair', 'Table', 'Cup', 'Bottle', 'Key'
  ]
};

// Utility functions
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const getRandomWord = (category) => {
  const words = CATEGORIES[category];
  return words[Math.floor(Math.random() * words.length)];
};

const createGameRoom = (hostId, category, turnsPerPlayer = 2, totalGames = 3) => {
  const roomId = generateRoomId();
  const word = getRandomWord(category);
  
  return {
    id: roomId,
    hostId,
    players: [],
    category,
    word,
    currentTurn: 0,
    gamePhase: 'lobby',
    drawingData: [],
    maxPlayers: 12,
    turnTimeLimit: 15,
    currentTurnStartTime: 0,
    votes: {},
    turnsPerPlayer,
    completedTurns: 0,
    totalGames,
    currentGame: 1,
    gameHistory: [],
    seriesScores: {},
    usedWords: [word]
  };
};

const addPlayerToRoom = (room, playerId, playerName, avatar, color) => {
  const isHost = room.hostId === playerId;
  
  const newPlayer = {
    id: playerId,
    name: playerName,
    avatar: avatar || '😀',
    color,
    isHost,
    isFakeArtist: false,
    hasVoted: false,
    hasGuessed: false,
    score: 0
  };
  
  return {
    ...room,
    players: [...room.players, newPlayer]
  };
};

const startGame = (room) => {
  const players = [...room.players];
  
  // Determine number of fake artists based on player count
  const numFakeArtists = players.length >= 10 ? 2 : 1;
  
  // Reset all players first
  players.forEach(player => {
    player.isFakeArtist = false;
  });
  
  // Randomly select fake artists
  const shuffledIndices = Array.from({ length: players.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5);
  const fakeArtistIndices = shuffledIndices.slice(0, numFakeArtists);
  
  fakeArtistIndices.forEach(index => {
    players[index].isFakeArtist = true;
  });
  
  return {
    ...room,
    players,
    gamePhase: 'drawing',
    currentTurn: 0,
    currentTurnStartTime: Date.now()
  };
};

const calculateScores = (room) => {
  const fakeArtists = room.players.filter(p => p.isFakeArtist);
  const votes = Object.values(room.votes);
  const fakeArtistVotes = votes.filter(vote => 
    fakeArtists.some(fa => fa.id === vote)
  ).length;
  const totalVotes = votes.length;
  
  // Check if any fake artist guessed correctly
  const anyFakeArtistGuessedCorrectly = fakeArtists.some(fa => fa.guessResult?.isCorrect);
  
  // Fake artists are caught if they get the MOST votes (plurality)
  const voteCounts = {};
  votes.forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });
  
  const maxVotes = Math.max(...Object.values(voteCounts));
  const mostVotedPlayers = Object.keys(voteCounts).filter(playerId => voteCounts[playerId] === maxVotes);
  const fakeArtistsCaught = fakeArtists.some(fa => mostVotedPlayers.includes(fa.id));
  
  const players = room.players.map(player => {
    let score = 0;
    
    if (player.isFakeArtist) {
      // Fake artist wins if they guess correctly OR avoid being caught
      if (anyFakeArtistGuessedCorrectly || !fakeArtistsCaught) {
        score = 3;
      }
    } else {
      // Regular players get points for correctly voting for fake artist
      const votedForFakeArtist = fakeArtists.some(fa => room.votes[player.id] === fa.id);
      
      if (votedForFakeArtist) {
        const correctVoters = room.players.filter(p => 
          !p.isFakeArtist && fakeArtists.some(fa => room.votes[p.id] === fa.id)
        );
        const totalCorrectVotes = correctVoters.length;
        const totalRegularPlayers = room.players.filter(p => !p.isFakeArtist).length;
        
        // Balanced scoring based on how many got it right
        if (totalCorrectVotes === 1) {
          score = 5; // Only one person got it right
        } else if (totalCorrectVotes === 2) {
          score = 3; // Two people got it right
        } else if (totalCorrectVotes <= Math.ceil(totalRegularPlayers / 2)) {
          score = 2; // Half or fewer got it right
        } else {
          score = 1; // Most people got it right
        }
        
        // Bonus points if fake artist also lost
        const fakeArtistWon = anyFakeArtistGuessedCorrectly || !fakeArtistsCaught;
        if (!fakeArtistWon) {
          score += 1;
        }
      }
    }
    
    return { ...player, score: player.score + score };
  });
  
  return { ...room, players };
};

// Simple word matching for fake artist guesses
const checkWordGuess = (guess, correctWord) => {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedCorrect = correctWord.toLowerCase().trim();
  
  // Exact match
  if (normalizedGuess === normalizedCorrect) {
    return {
      isCorrect: true,
      confidence: 1.0,
      reason: 'Exact match'
    };
  }
  
  // Simple similarity check
  const similarity = normalizedGuess.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedGuess);
  
  return {
    isCorrect: similarity,
    confidence: similarity ? 0.8 : 0.0,
    reason: similarity ? 'Partial match' : 'No match'
  };
};

// In-memory game state
const gameState = { rooms: {} };

// Track player heartbeats to detect disconnections
const playerHeartbeats = new Map(); // playerId -> { roomId, lastSeen, isHost }

// Clean up disconnected players more frequently
setInterval(() => {
  const now = Date.now();
  const DISCONNECT_TIMEOUT = 90 * 1000; // 90 seconds (9 missed heartbeats at 10s intervals)
  
  console.log(`🔍 Checking for disconnected players... (${playerHeartbeats.size} tracked)`);
  
  for (const [playerId, heartbeat] of playerHeartbeats.entries()) {
    if (now - heartbeat.lastSeen > DISCONNECT_TIMEOUT) {
      console.log('🔌 Player disconnected due to timeout:', {
        playerId,
        roomId: heartbeat.roomId,
        lastSeen: new Date(heartbeat.lastSeen).toISOString(),
        timeoutMs: now - heartbeat.lastSeen
      });
      
      const room = gameState.rooms[heartbeat.roomId];
      if (room) {
        const player = room.players.find(p => p.id === playerId);
        const playerName = player?.name || 'Unknown';
        
        if (heartbeat.isHost) {
          console.log('🏠 Host disconnected due to timeout, but checking if game is active:', {
            roomId: heartbeat.roomId,
            hostName: playerName
          });
          
          // Only close room if it's in lobby phase or has very few players
          if (room.gamePhase === 'lobby' || room.players.length <= 2) {
            console.log('🏠 Closing room due to host disconnect in lobby or low players');
            delete gameState.rooms[heartbeat.roomId];
            
            // Remove all heartbeats for this room
            for (const [pid, hb] of playerHeartbeats.entries()) {
              if (hb.roomId === heartbeat.roomId) {
                playerHeartbeats.delete(pid);
              }
            }
          } else {
            console.log('🏠 Host disconnected but game is active, keeping room alive for now');
            // Mark host as disconnected but don't close room immediately
            if (player) {
              player.isDisconnected = true;
            }
          }
        } else {
          console.log('👤 Regular player disconnected due to timeout, removing from room:', {
            playerId,
            playerName,
            roomId: heartbeat.roomId
          });
          // Remove player from room
          room.players = room.players.filter(p => p.id !== playerId);
          
          // Clean up votes and game state
          if (room.votes[playerId]) {
            delete room.votes[playerId];
          }
          
          // Adjust current turn if needed
          if (room.gamePhase === 'drawing') {
            // If the disconnected player was the current turn player, advance turn
            const currentPlayer = room.players[room.currentTurn];
            if (!currentPlayer || currentPlayer.id === playerId) {
              room.currentTurn = room.currentTurn % Math.max(room.players.length, 1);
              room.currentTurnStartTime = Date.now();
              console.log('🔄 Adjusted current turn after disconnect:', {
                newCurrentTurn: room.currentTurn,
                newCurrentPlayer: room.players[room.currentTurn]?.name || 'None'
              });
            }
          }
        }
      }
      
      playerHeartbeats.delete(playerId);
    }
  }
}, 30000); // Check every 30 seconds
)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    rooms: Object.keys(gameState.rooms).length,
    port: PORT,
    endpoints: [
      'GET /api/health',
      'POST /api/game/create',
      'POST /api/game/:roomId/join',
      'GET /api/game/:roomId',
      'POST /api/game/:roomId/start',
      'POST /api/game/:roomId/update-settings',
      'POST /api/game/:roomId/draw',
      'POST /api/game/:roomId/next-turn',
      'POST /api/game/:roomId/vote',
      'POST /api/game/:roomId/guess-word',
      'POST /api/game/:roomId/reset',
      'POST /api/game/:roomId/kick-player'
    ]
  });
});

// Create game room
app.post('/api/game/create', (req, res) => {
  const { hostId, playerName, category, turnsPerPlayer = 2, avatar = '😀', color = '#FF6B6B', totalGames = 3 } = req.body;
  
  console.log('Creating game room:', { hostId, playerName, category, turnsPerPlayer, avatar, color, totalGames });
  
  try {
    const room = createGameRoom(hostId, category, turnsPerPlayer, totalGames);
    const roomWithPlayer = addPlayerToRoom(room, hostId, playerName, avatar, color);
    gameState.rooms[room.id] = roomWithPlayer;
    
    // Track host heartbeat
    playerHeartbeats.set(hostId, {
      roomId: room.id,
      lastSeen: Date.now(),
      isHost: true
    });
    
    console.log('Game room created:', room.id);
    res.json(roomWithPlayer);
  } catch (error) {
    console.error('Error creating game room:', error);
    res.status(500).json({ error: 'Failed to create game room' });
  }
});

// Join game room
app.post('/api/game/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerId, playerName, avatar = '😀', color = '#FF6B6B', isRejoin = false } = req.body;
  
  console.log('Player joining room:', { roomId, playerId, playerName, avatar, color, isRejoin });
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      console.log('Room not found:', roomId);
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.players.length >= room.maxPlayers) {
      console.log('Room is full:', roomId);
      return res.status(400).json({ error: 'Room is full' });
    }
    
    // Check if player is rejoining (same playerId)
    const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
    if (existingPlayerIndex !== -1) {
      // Player is rejoining - update their info but keep their role and score
      console.log('🔄 Player rejoining after kick/disconnect:', playerName);
      const existingPlayer = room.players[existingPlayerIndex];
      
      // Check if new name/avatar/color conflicts with OTHER players
      const nameConflict = room.players.some(p => p.name === playerName && p.id !== playerId);
      const avatarConflict = room.players.some(p => p.avatar === avatar && p.id !== playerId);
      const colorConflict = room.players.some(p => p.color === color && p.id !== playerId);
      
      if (nameConflict) {
        console.log('Name conflict on rejoin:', playerName);
        return res.status(400).json({ error: 'Name already taken' });
      }
      
      if (avatarConflict) {
        console.log('Avatar conflict on rejoin:', avatar);
        return res.status(400).json({ error: 'Avatar already taken' });
      }
      
      if (colorConflict) {
        console.log('Color conflict on rejoin:', color);
        return res.status(400).json({ error: 'Color already taken' });
      }
      
      // Update player info while preserving game state
      room.players[existingPlayerIndex] = {
        ...existingPlayer,
        name: playerName,
        avatar,
        color
      };
      
      // Update heartbeat tracking
      playerHeartbeats.set(playerId, {
        roomId: roomId,
        lastSeen: Date.now(),
        isHost: existingPlayer.isHost
      });
      
      console.log('Player rejoined successfully:', { roomId, playerName });
      return res.json(room);
    }
    
    // Check if name is taken by a different player
    if (room.players.some(p => p.name === playerName && p.id !== playerId)) {
      console.log('Name already taken:', playerName);
      return res.status(400).json({ error: 'Name already taken' });
    }
    
    if (room.players.some(p => p.avatar === avatar && p.id !== playerId)) {
      console.log('Avatar already taken:', avatar);
      return res.status(400).json({ error: 'Avatar already taken' });
    }
    
    if (room.players.some(p => p.color === color && p.id !== playerId)) {
      console.log('Color already taken:', color);
      return res.status(400).json({ error: 'Color already taken' });
    }
    
    const updatedRoom = addPlayerToRoom(room, playerId, playerName, avatar, color);
    gameState.rooms[roomId] = updatedRoom;
    
    // Track player heartbeat
    playerHeartbeats.set(playerId, {
      roomId: roomId,
      lastSeen: Date.now(),
      isHost: false
    });
    
    console.log('Player joined successfully:', { roomId, playerName });
    res.json(updatedRoom);
  } catch (error) {
    console.error('Error joining game room:', error);
    res.status(500).json({ error: 'Failed to join game room' });
  }
});

// Get game room state
app.get('/api/game/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = gameState.rooms[roomId];
  
  if (!room) {
    console.log('Room not found for status check:', roomId);
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(room);
});

// Player heartbeat endpoint
app.post('/api/game/:roomId/heartbeat', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  const now = Date.now();
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      console.log('❌ Heartbeat: Room not found:', roomId, 'for player:', playerId);
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      console.log('❌ Heartbeat: Player not found in room:', { playerId, roomId, playersInRoom: room.players.map(p => p.name) });
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const wasTracked = playerHeartbeats.has(playerId);
    const previousHeartbeat = playerHeartbeats.get(playerId);
    
    // Update heartbeat
    playerHeartbeats.set(playerId, {
      roomId: roomId,
      lastSeen: now,
      isHost: player.isHost
    });
    
    if (!wasTracked) {
      console.log('💓 Heartbeat tracking started:', {
        playerId,
        playerName: player.name,
        roomId,
        isHost: player.isHost
      });
    } else {
      // Only log every 5th heartbeat to reduce spam
      const heartbeatCount = Math.floor((now - (previousHeartbeat?.lastSeen || now)) / 10000);
      if (heartbeatCount % 5 === 0) {
        console.log('💓 Heartbeat received:', {
          playerName: player.name,
          roomId,
          isHost: player.isHost,
          timeSinceLastHeartbeat: now - (previousHeartbeat?.lastSeen || now)
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// Player leave endpoint
app.post('/api/game/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  console.log('Player leaving room:', { roomId, playerId });
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      console.log('Room not found for leave:', roomId);
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      console.log('Player not found for leave:', playerId);
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const playerName = player.name;
    const isHost = player.isHost;
    
    if (isHost) {
      console.log('🏠 Host is leaving, closing room:', roomId);
      // Host is leaving - close the entire room
      delete gameState.rooms[roomId];
      
      // Remove all player heartbeats for this room
      for (const [pid, heartbeat] of playerHeartbeats.entries()) {
        if (heartbeat.roomId === roomId) {
          playerHeartbeats.delete(pid);
        }
      }
      
      console.log('Room closed due to host leaving:', { roomId, hostName: playerName });
      return res.json({ roomClosed: true, message: 'Room closed by host' });
    } else {
      console.log('👤 Regular player leaving:', { playerId, playerName });
      // Regular player leaving - just remove them
      room.players = room.players.filter(p => p.id !== playerId);
      
      // Clean up votes and game state
      if (room.votes[playerId]) {
        delete room.votes[playerId];
        // Reset hasVoted for voters who voted for this player
        Object.keys(room.votes).forEach(voterId => {
          if (room.votes[voterId] === playerId) {
            delete room.votes[voterId];
            const voter = room.players.find(p => p.id === voterId);
            if (voter) {
              voter.hasVoted = false;
            }
          }
        });
      }
      
      // Adjust current turn if the leaving player was the current player
      if (room.gamePhase === 'drawing' && room.players[room.currentTurn]?.id === playerId) {
        room.currentTurn = room.currentTurn % room.players.length;
        room.currentTurnStartTime = Date.now();
        console.log('Adjusted current turn after player left');
      }
      
      // Remove heartbeat tracking
      playerHeartbeats.delete(playerId);
      
      console.log('Player left successfully:', {
        roomId,
        leftPlayer: playerName,
        remainingPlayers: room.players.length
      });
      
      return res.json(room);
    }
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Start game
app.post('/api/game/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      return res.status(403).json({ error: 'Only host can start game' });
    }
    
    if (room.players.length < 3) {
      return res.status(400).json({ error: 'Need at least 3 players' });
    }
    
    const startedRoom = startGame(room);
    gameState.rooms[roomId] = startedRoom;
    
    res.json(startedRoom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Update game settings (for host only) - THIS IS THE MISSING ENDPOINT!
app.post('/api/game/:roomId/update-settings', (req, res) => {
  const { roomId } = req.params;
  const { playerId, category, turnsPerPlayer, totalGames } = req.body;
  
  console.log('🔧 Update settings request:', { roomId, playerId, category, turnsPerPlayer, totalGames });
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      console.log('❌ Room not found for settings update:', roomId);
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      console.log('❌ Non-host trying to update settings:', playerId);
      return res.status(403).json({ error: 'Only host can update settings' });
    }
    
    // Prevent settings changes during an active series
    if ((room.currentGame || 1) > 1) {
      console.log('❌ Settings change blocked - series in progress');
      return res.status(400).json({ error: 'Cannot change settings during active series' });
    }
    
    // Update settings
    if (category !== undefined) {
      room.category = category;
      room.word = getRandomWord(category); // Get new word for new category
      console.log('✅ Updated category to:', category, 'new word:', room.word);
    }
    if (turnsPerPlayer !== undefined) {
      room.turnsPerPlayer = turnsPerPlayer;
      console.log('✅ Updated turnsPerPlayer to:', turnsPerPlayer);
    }
    if (totalGames !== undefined) {
      room.totalGames = totalGames;
      console.log('✅ Updated totalGames to:', totalGames);
    }
    
    console.log('🎉 Settings updated successfully:', {
      roomId,
      category: room.category,
      turnsPerPlayer: room.turnsPerPlayer,
      totalGames: room.totalGames
    });
    
    res.json(room);
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Submit drawing
app.post('/api/game/:roomId/draw', (req, res) => {
  const { roomId } = req.params;
  const { playerId, points } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== playerId) {
      return res.status(403).json({ error: 'Not your turn' });
    }
    
    room.drawingData.push(...points);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit drawing' });
  }
});

// Next turn
app.post('/api/game/:roomId/next-turn', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== playerId && !room.players.find(p => p.id === playerId)?.isHost) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    room.completedTurns += 1;
    room.currentTurn = (room.currentTurn + 1) % room.players.length;
    room.currentTurnStartTime = Date.n
  }
}
)ow();
    
    // Check if all turns are completed
    const totalTurnsNeeded = room.players.length * room.turnsPerPlayer;
    if (room.completedTurns >= totalTurnsNeeded) {
      room.gamePhase = 'voting';
    }
    
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to advance turn' });
  }
});

// Submit vote
app.post('/api/game/:roomId/vote', (req, res) => {
  const { roomId } = req.params;
  const { playerId, voteFor } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.gamePhase !== 'voting') {
      return res.status(400).json({ error: 'Not in voting phase' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    room.votes[playerId] = voteFor;
    player.hasVoted = true;
    
    // Check if all players have voted
    const votedPlayers = Object.keys(room.votes).length;
    const regularPlayersCount = room.players.filter(p => !p.isFakeArtist).length;
    const fakeArtists = room.players.filter(p => p.isFakeArtist);
    
    // Game ends when all regular players vote AND all fake artists have guessed
    const allFakeArtistsGuessed = fakeArtists.length === 0 || fakeArtists.every(fa => fa.hasGuessed);
    if (votedPlayers === regularPlayersCount && allFakeArtistsGuessed) {
      const finalRoom = calculateScores(room);
      finalRoom.gamePhase = 'results';
      gameState.rooms[roomId] = finalRoom;
      return res.json(finalRoom);
    }
    
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// Submit word guess (for fake artist)
app.post('/api/game/:roomId/guess-word', (req, res) => {
  const { roomId } = req.params;
  const { playerId, guess } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.gamePhase !== 'voting') {
      return res.status(400).json({ error: 'Not in voting phase' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (!player.isFakeArtist) {
      return res.status(403).json({ error: 'Only fake artist can guess the word' });
    }
    
    const guessResult = checkWordGuess(guess, room.word);
    
    player.hasGuessed = true;
    player.wordGuess = guess;
    player.guessResult = guessResult;
    
    // Check if voting should end
    const votedPlayers = Object.keys(room.votes).length;
    const regularPlayersCount = room.players.filter(p => !p.isFakeArtist).length;
    const fakeArtists = room.players.filter(p => p.isFakeArtist);
    const allFakeArtistsGuessed = fakeArtists.every(fa => fa.hasGuessed);
    
    if (votedPlayers === regularPlayersCount && allFakeArtistsGuessed) {
      const finalRoom = calculateScores(room);
      finalRoom.gamePhase = 'results';
      gameState.rooms[roomId] = finalRoom;
      return res.json(finalRoom);
    }
    
    res.json(room);
  } catch (error) {
    console.error('Word guess error:', error);
    res.status(500).json({ error: 'Failed to submit word guess' });
  }
});

// Reset game (play again with same players)
app.post('/api/game/:roomId/reset', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      return res.status(403).json({ error: 'Only host can reset game' });
    }
    
    // Handle series progression
    const currentGameNumber = room.currentGame || 1;
    const totalGames = room.totalGames || 1;
    const isSeriesComplete = currentGameNumber >= totalGames;
    
    console.log('🎮 Reset Game - Series Logic:', {
      currentGame: currentGameNumber,
      totalGames: totalGames,
      isSeriesComplete,
      action: isSeriesComplete ? 'Starting new series' : 'Advancing to next game'
    });
    
    // Reset game state but keep players and their scores
    room.gamePhase = 'lobby';
    room.currentTurn = 0;
    room.completedTurns = 0;
    room.drawingData = [];
    room.votes = {};
    room.currentTurnStartTime = 0;
    
    // Handle series progression
    if (isSeriesComplete || totalGames === 1) {
      // Start new series - reset everything
      console.log('🔄 Starting new series - resetting all scores and game counter');
      room.currentGame = 1;
      room.gameHistory = [];
      room.seriesScores = {};
      room.usedWords = [];
      
      // Reset all player scores for new series
      room.players = room.players.map(player => ({
        ...player,
        score: 0,
        isFakeArtist: false,
        hasVoted: false,
        voteFor: undefined,
        hasGuessed: false,
        wordGuess: undefined,
        guessResult: undefined
      }));
    } else {
      // Continue series - advance to next game
      console.log('➡️ Advancing to next game in series');
      room.currentGame = currentGameNumber + 1;
      
      // Reset player states but keep scores
      room.players = room.players.map(player => ({
        ...player,
        isFakeArtist: false,
        hasVoted: false,
        voteFor: undefined,
        hasGuessed: false,
        wordGuess: undefined,
        guessResult: undefined
      }));
    }
    
    // Get new word from same category
    const usedWords = room.usedWords || [];
    room.word = getRandomWord(room.category);
    
    // Track used words to avoid repetition
    if (!usedWords.includes(room.word)) {
      room.usedWords = [...usedWords, room.word];
    }
    
    console.log('✅ Game reset complete:', {
      newGameNumber: room.currentGame,
      totalGames: room.totalGames,
      newWord: room.word,
      playersCount: room.players.length
    });
    
    res.json(room);
  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
});

// Kick player (host only)
app.post('/api/game/:roomId/kick-player', (req, res) => {
  const { roomId } = req.params;
  const { hostId, playerIdToKick } = req.body;
  
  console.log('Kick player request:', { roomId, hostId, playerIdToKick });
  
  try {
    const room = gameState.rooms[roomId];
    if (!room) {
      console.log('Room not found for kick:', roomId);
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const host = room.players.find(p => p.id === hostId);
    if (!host || !host.isHost) {
      console.log('Non-host trying to kick player:', hostId);
      return res.status(403).json({ error: 'Only host can kick players' });
    }
    
    const playerToKick = room.players.find(p => p.id === playerIdToKick);
    if (!playerToKick) {
      console.log('Player to kick not found:', playerIdToKick);
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (playerToKick.isHost) {
      console.log('Cannot kick host:', playerIdToKick);
      return res.status(400).json({ error: 'Cannot kick the host' });
    }
    
    // Store player info for logging
    const kickedPlayerName = playerToKick.name;
    
    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerIdToKick);
    
    // If game is in progress and we kicked the current turn player, advance turn
    if (room.gamePhase === 'drawing' && room.players[room.currentTurn]?.id === playerIdToKick) {
      room.currentTurn = room.currentTurn % room.players.length;
      room.currentTurnStartTime = Date.now();
      console.log('Adjusted current turn after kicking active player');
    }
    
    // Remove any votes from/for the kicked player
    if (room.votes[playerIdToKick]) {
      delete room.votes[playerIdToKick];
      console.log('Removed votes from kicked player');
    }
    
    Object.keys(room.votes).forEach(voterId => {
      if (room.votes[voterId] === playerIdToKick) {
        delete room.votes[voterId];
        // Reset hasVoted for the voter
        const voter = room.players.find(p => p.id === voterId);
        if (voter) {
          voter.hasVoted = false;
          console.log('Reset vote status for player who voted for kicked player:', voter.name);
        }
      }
    });
    
    // If we're in voting phase and all remaining players have voted, check if game should end
    if (room.gamePhase === 'voting') {
      const votedPlayers = Object.keys(room.votes).length;
      const regularPlayersCount = room.players.filter(p => !p.isFakeArtist).length;
      const fakeArtists = room.players.filter(p => p.isFakeArtist);
      const allFakeArtistsGuessed = fakeArtists.length === 0 || fakeArtists.every(fa => fa.hasGuessed);
      
      if (votedPlayers === regularPlayersCount && allFakeArtistsGuessed) {
        console.log('All remaining players have voted after kick, ending game');
        const finalRoom = calculateScores(room);
        finalRoom.gamePhase = 'results';
        gameState.rooms[roomId] = finalRoom;
        
        console.log('Player kicked and game ended:', {
          roomId,
          kickedPlayer: kickedPlayerName,
          remainingPlayers: finalRoom.players.length,
          gamePhase: finalRoom.gamePhase
        });
        
        return res.json(finalRoom);
      }
    }
    
    console.log('Player kicked successfully:', {
      roomId,
      kickedPlayer: kickedPlayerName,
      remainingPlayers: room.players.length
    });
    
    res.json(room);
  } catch (error) {
    console.error('Kick player error:', error);
    res.status(500).json({ error: 'Failed to kick player' });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log('✅ Server setup complete');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('✅ Server initialization complete');