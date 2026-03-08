# 🤖 AI Configuration Guide

## Quick Setup

Your AI Timetable app needs an AI provider to generate smart schedules. Follow these steps:

---

## Option 1: OpenAI (Recommended) ✅

### Step 1: Get Your API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Click on your profile (top right) → **API keys**
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

### Step 2: Add to `.env` File

Open your `.env` file and replace:
```env
REACT_APP_AI_API_KEY=your-api-key-here
```

With:
```env
REACT_APP_AI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Restart Your App

```bash
# Stop the running app (Ctrl+C)
npm start
```

**Cost**: ~$0.01-0.05 per weekly plan generation (very affordable!)

---

## Option 2: Google Gemini (Free Tier Available) 🆓

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Get API Key"**
3. Create a new API key
4. Copy the key

### Step 2: Update `.env` File

```env
REACT_APP_AI_PROVIDER=gemini
REACT_APP_AI_API_KEY=your-gemini-api-key-here
```

### Step 3: Restart Your App

```bash
npm start
```

**Cost**: Free tier available! (60 requests/minute)

---

## Option 3: Anthropic Claude

### Step 1: Get Your API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up and get access
3. Go to API Keys section
4. Create a new API key
5. Copy the key

### Step 2: Update `.env` File

```env
REACT_APP_AI_PROVIDER=anthropic
REACT_APP_AI_API_KEY=your-anthropic-api-key-here
```

### Step 3: Restart Your App

```bash
npm start
```

---

## ✅ Testing Your Configuration

1. **Go to your app** → Dashboard → **Weekly Plan**
2. Click **"Generate weekly plan"**
3. If configured correctly:
   - The button will show "Generating..."
   - You'll see your AI-generated timetable in ~5-10 seconds
   - A summary and suggestions will appear

4. If you see an error:
   - Check your API key is correct
   - Make sure you restarted the app after changing `.env`
   - Check you have credits/quota in your AI provider account

---

## 💰 Cost Comparison

| Provider | Free Tier | Cost per Plan | Best For |
|----------|-----------|---------------|----------|
| **Gemini** | ✅ Yes | Free (within limits) | Students, testing |
| **OpenAI** | $5 credit (new users) | ~$0.02 | Most reliable |
| **Anthropic** | Limited trial | ~$0.03 | Advanced users |

---

## 🔒 Security Tips

1. ✅ **Never commit your `.env` file to Git** (already in `.gitignore`)
2. ✅ **Keep your API keys private**
3. ✅ **Set usage limits** in your provider's dashboard
4. ✅ **Rotate keys regularly** if shared in a team

---

## 🆘 Troubleshooting

### Error: "AI is not configured"
- ❌ Your `.env` file is missing the API key
- ✅ Add `REACT_APP_AI_API_KEY=your-key` to `.env`
- ✅ Restart the app

### Error: "Invalid API key"
- ❌ Wrong API key or wrong provider
- ✅ Double-check you copied the full key
- ✅ Make sure `REACT_APP_AI_PROVIDER` matches your key provider

### Error: "Rate limit exceeded"
- ❌ Too many requests
- ✅ Wait a few minutes
- ✅ Consider upgrading your plan

### Plans not generating
- ✅ Check browser console (F12) for detailed errors
- ✅ Verify you have internet connection
- ✅ Check your API provider's status page

---

## 📖 How It Works

When you click "Generate weekly plan":

1. **Your data** (courses, sleep schedule, study hours) is sent to the AI
2. **AI analyzes** your constraints and preferences
3. **Smart schedule** is created with:
   - Optimal study times
   - Break periods
   - Course priority balancing
   - Sleep schedule respect
4. **Results** are displayed with suggestions for improvement

---

## 🎯 Recommended: Start with Gemini (Free)

For students just getting started:

```env
REACT_APP_AI_PROVIDER=gemini
REACT_APP_AI_API_KEY=your-gemini-api-key-from-google-ai-studio
```

1. Free tier is generous
2. Fast response times
3. Good quality plans
4. No credit card required initially

---

## Need Help?

- Check the [OpenAI Documentation](https://platform.openai.com/docs)
- Check the [Gemini API Documentation](https://ai.google.dev/docs)
- Look at error messages in browser console (F12)

**Ready to generate your first AI timetable!** 🚀
