# Fake Artist Game - Backend Server

This is the backend server for the Fake Artist Drawing Game.

## Files for GitHub Repository

Upload these files to your GitHub repository:

### Required Files:
- `server.js` - Main backend server
- `package.json` - Dependencies and scripts  
- `railway.json` - Railway deployment configuration
- `.gitignore` - Git ignore file
- `README-BACKEND.md` - This documentation

### Deployment Steps:

1. **Create GitHub Repository:**
   ```bash
   git init
   git add server.js package.json railway.json .gitignore README-BACKEND.md
   git commit -m "Backend server for Fake Artist Game"
   git remote add origin https://github.com/YOUR_USERNAME/fake-artist-backend.git
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Sign up/login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically deploy

3. **Get Your URL:**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Test health check: `https://your-app.up.railway.app/api/health`

4. **Update Frontend:**
   - The frontend is already configured to use Railway
   - Once deployed, all game features will work!

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/game/create` - Create game room
- `POST /api/game/:roomId/join` - Join game room
- `GET /api/game/:roomId` - Get room state
- `POST /api/game/:roomId/start` - Start game
- `POST /api/game/:roomId/update-settings` - Update game settings
- `POST /api/game/:roomId/draw` - Submit drawing
- `POST /api/game/:roomId/next-turn` - Next turn
- `POST /api/game/:roomId/vote` - Submit vote
- `POST /api/game/:roomId/guess-word` - Fake artist word guess
- `POST /api/game/:roomId/reset` - Reset/play again

## Environment Variables

Railway automatically sets:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production)

## Troubleshooting

**Build Fails:**
- Ensure all files are in repository root
- Check Node.js version compatibility (>=18.0.0)

**Server Won't Start:**
- Check Railway logs for errors
- Verify `server.js` is in root directory

**CORS Errors:**
- Frontend domain should be in CORS configuration
- Check allowed origins in `server.js`

**404 Errors:**
- Verify all endpoints are implemented
- Test with: `curl https://your-app.up.railway.app/api/health`

## Success Checklist

- ✅ Repository created with all required files
- ✅ Railway deployment successful
- ✅ Health check endpoint responding
- ✅ All game endpoints working
- ✅ Frontend can connect to backend
- ✅ Game functionality tested end-to-end