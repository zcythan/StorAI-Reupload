const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cors = require('cors');
const passport = require('passport');
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const {
  RunnableSequence,
} = require("@langchain/core/runnables");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const path = require('path');
const crypto = require('crypto');

if (!process.env.PROD) {
    require('dotenv').config();
  }
  const envHTTPS = process.env.HTTPS.toLowerCase() === 'true';

  const OpenAI = require('openai').default;
  const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
  });

  const encryptionKey = Buffer.from(process.env.CHAT_KEY, 'base64'); 

  let embeddings; 
  let vectorStore;
  let myresStore;

  async function initialize() {
    try {
        embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
        vectorStore = await FaissStore.load(path.join(__dirname, 'vector_database'), embeddings);
        myresStore = await FaissStore.load(path.join(__dirname, 'myres_database'), embeddings);

    } catch (error) {
        console.error("Failed to initialize application:", error);
        process.exit(1); 
    }
}
  
initialize();
 
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-3.5-turbo", 
    maxTokens: 700 
});

const app = express();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'user_data',
  password: process.env.DB_PASS,
  port: process.env.DB_PORT
});

app.use(session({
    store: new pgSession({
      pool: pool, 
    }),
    secret: process.env.SESSION_SEC, 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: envHTTPS, maxAge: 30 * 24 * 60 * 60 * 1000 } 
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  
  passport.serializeUser((user, done) => {
    done(null, user.id, user.username); 
  });
  
  passport.deserializeUser((id, done) => {
    pool.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
      if (err) {
        return done(err);
      }
      done(null, result.rows[0]);
    });
  });
    

app.use(cors({
    origin: process.env.FRONTEND_URL, // Frontend server URL
    credentials: true // Allow sending of cookies
  }));

  app.use(express.json());

  function extractRelevantPassages(text, query, maxChars = 500) {
    const stopWords = new Set([
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 
      'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
      'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 
      'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
      'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 
      'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
      'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 
      'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
    ]);
  

  
    const sentences = text.match(/(?<=\s|^)(?:(?![.!?])[\s\S])*(?:[.!?]+|$)/g) || [];
    let documentWordFrequencies = {};

    // Calculate document-wide word frequencies for IDF calculations
    text.toLowerCase().split(/\s+/).forEach(word => {
      if (!stopWords.has(word)) {
        documentWordFrequencies[word] = (documentWordFrequencies[word] || 0) + 1;
      }
    });

    const queryWords = query.toLowerCase().split(/\s+/).filter(word => !stopWords.has(word) && documentWordFrequencies[word]);

    let scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = queryWords.reduce((acc, word) => {
        const termFrequency = words.filter(w => w === word).length;
        const inverseDocFreq = Math.log((sentences.length + 1) / (documentWordFrequencies[word] || 1));
        return acc + (termFrequency * inverseDocFreq);
      }, 0);
      return { sentence, score };
    }).sort((a, b) => b.score - a.score);

    // Check if any sentences scored above zero
    let relevantSentences = scoredSentences.filter(s => s.score > 0);

    let result = "";
    let sourceData = relevantSentences.length > 0 ? relevantSentences : scoredSentences; // Fallback to all sentences if no relevant ones

    // Building result string with individual document character limit
    for (let {sentence} of sourceData) {
      if (result.length + sentence.length > maxChars) {
        if (result.length === 0) {
          result = sentence.substring(0, maxChars).trim() + (maxChars < sentence.length ? "..." : "");
          break;
        }
        let spaceLeft = maxChars - result.length;
        if (spaceLeft > 0) {
          let snippet = sentence.substring(0, spaceLeft);
          let lastSpaceIndex = snippet.lastIndexOf(" ");
          snippet = lastSpaceIndex > -1 ? snippet.substring(0, lastSpaceIndex).trim() + "..." : snippet;
          result += snippet;
        }
        break;
      }
      result += sentence + " ";
    }

    return result.trim();
}
  

  const searchVectorDB = async (query, aiType) => {
    if (!query || typeof query !== 'string') {
      console.error('Invalid query provided to searchVectorDB');
      return "Invalid query provided.";
    }
    // Search for the most similar documents
    let results;
    if (aiType === 'myers-briggs') {
      results = await myresStore.similaritySearch(query, 4); 
    } else {
      results = await vectorStore.similaritySearch(query, 4); 
    }
    //console.log("Search results:", results); //shows what the DB finds
  
    let formattedContext = [];
  
    if (results.length > 0) {
      results.forEach(result => {
        if (result.pageContent) {
          const relevantPassages = extractRelevantPassages(result.pageContent, query); // Requesting 3 sentences
          formattedContext.push(relevantPassages);
        }
      });
    }
  
    if (formattedContext.length === 0) {
      formattedContext = "No relevant documents found or document structure is incorrect.";
    } else {
      formattedContext = formattedContext.join('\n\n'); 
    }
  
   // console.log("Formatted Context:", formattedContext); //shows after filtering
    return formattedContext;
  };
  

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

async function getChatSummary(userId, aiType) {
  const query = 'SELECT summary FROM chat_summaries WHERE user_id = $1 AND ai_type = $2';
  try {
      const res = await pool.query(query, [userId, aiType]);
      const summary = res.rows.length > 0 ? res.rows[0].summary : "";
      if (summary === ""){
          return "";
      }
      return decrypt(summary)
  } catch (err) {
      console.error('Error retrieving chat summary:', err);
      return "";
  }
}

async function saveChatSummary(userId, aiType, summary) {
  const encryptedSummary = encrypt(summary);
  const query = `
      INSERT INTO chat_summaries (user_id, ai_type, summary, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, ai_type) 
      DO UPDATE SET summary = EXCLUDED.summary, created_at = NOW();
  `;
  try {
      await pool.query(query, [userId, aiType, encryptedSummary]);
  } catch (err) {
      console.error('Failed to save chat summary:', err);
  }
}


async function Summarize(lastSummary, userMessage, newResponseContent) {
  const messages = [
      {
          "role": "system",
          "content": "The following is a summary of the previous conversation and the latest exchange between the user and agent. Please generate a concise summary geared for future chat persistence containing as much relavent information from both as possible. Put extra focus on remembering the user's name and personality type if they are offered"
      },
      {
          "role": "user",
          "content": lastSummary
      },
      {
          "role": "user",
          "content": userMessage
      },
      {
          "role": "assistant",
          "content": newResponseContent
      }
  ];

  try {
      const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: 300,
          temperature: 0.5, // Adjust for more deterministic outputs
          top_p: 1.0,
          frequency_penalty: 0,
          presence_penalty: 0,
          stop: ["user:", "assistant:", "system:"] 
      });

      const newSummary = completion.choices[0].message.content.trim();
      return newSummary;
  } catch (error) {
      console.error("Error in Summarize function:", error);
      throw error;
  }
}  

function countWords(text) {
  return text.trim().split(/\s+/).length;
}


app.post('/ai/generate-text', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('User not authenticated.');
    }
    const { ai_type, userMessage } = req.body;
    const userId = req.user.id;
    
    if (countWords(userMessage) > 50) {
      return res.status(400).send('Message must be 50 words or less.');
    }

    if (userMessage.length > 400) {
      return res.status(400).send("The text is longer than 400 characters.");
  }

    if (!userMessage) {
        return res.status(400).send('Query must not be empty.');
    }
  
    // Retrieve the current summary for this user and AI type
    const currentSummary = await getChatSummary(userId, ai_type);
    const context = await searchVectorDB(userMessage, ai_type);
    const answerTemplate = `You are a helpful AI assistant on a website called StorAI. Based on the summary of previous conversations, the current query, and provided context (if the context is not helpful then disregard it), please provide a helpful response and facilitate furthered discussion:
    Summary of Conversations: ${currentSummary}
    Current Query: ${userMessage}
    Context Information: ${context}
    Answer:`;

    const mTemplate = `You are a helpful AI assistant on a website called StorAI who specializes in Myres Briggs Personality Type assessment. Based on the summary of previous conversations, the current query, and provided context (disregard context if it contradicts the summary), please provide a helpful response facilitate furthered discussion:
    Summary of Conversations: ${currentSummary}
    Current Query: ${userMessage}
    Context Information: ${context}
    Answer:`;

    const ANSWER_PROMPT = PromptTemplate.fromTemplate(answerTemplate);
    const MY_PROMPT = PromptTemplate.fromTemplate(mTemplate);
    
    const answerChain = RunnableSequence.from([
        ANSWER_PROMPT,
        model
    ]);

    const mChain = RunnableSequence.from([
      MY_PROMPT,
      model
  ]);
  
    let result; 
    // Execute the chain with the user's query
    if(ai_type === 'myers-briggs') {
      result = await mChain.invoke({});
    } else {
      result = await answerChain.invoke({});
    }
  
    if (result.content) {
      res.json({ content: result.content });
      const newSummary = await Summarize(currentSummary, userMessage, result.content);
      await saveChatSummary(userId, ai_type, newSummary);
      const updateQuery = 'UPDATE users SET num_chats = num_chats + 1 WHERE id = $1';
      await pool.query(updateQuery, [userId])
          .then()
          .catch(err => console.error('Error incrementing num_chats:', err));
  
  } else {
      console.error('Failed to process result or unexpected result structure:', result);
      res.status(500).send('Failed to generate response');
  }
  
  });
  
  app.post('/ai/introduce', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('User not authenticated.');
    }
  
    const userId = req.user.id; 
    const { ai_type } = req.body;
  
    const currentSummary = await getChatSummary(userId, ai_type);
  
    let introductionTemplate;
  
    if (currentSummary) {
        if(ai_type === 'myers-briggs') {
        introductionTemplate = `You are a helpful AI assistant specialized in Myres Briggs personality types. Welcome the user back and remind them of what they were last discussing based on this summary:
        Summary of Conversations: ${currentSummary}
        Please continue where we left off or ask a new question.`;
        }
        
        introductionTemplate = `You are a helpful AI assistant on a website called StorAI. Welcome the user back and remind them of what they were last discussing based on this summary:
        Summary of Conversations: ${currentSummary}
        Please continue where we left off or ask a new question.`;
    } else {
        // No previous chat data, prepare the intro content
        if (ai_type === 'myers-briggs') {
            introductionTemplate = "You are an AI specialized in Myers-Briggs personality types. Please introduce yourself without giving yourself any special name, and prompt the user to provide their personality type for discussion.";
        } else {
            introductionTemplate = "You are a helpful assistant specialized in entrepreneurship on StorAI. Please introduce yourself without giving yourself any special name, and assist the user in exploring their entrepreneurial journey.";
        }
    }

    const ANSWER_PROMPT = PromptTemplate.fromTemplate(introductionTemplate);
    const answerChain = RunnableSequence.from([
        ANSWER_PROMPT,
        model
    ]);

 
    const result = await answerChain.invoke({});

    if (result.content) {
        res.json({aiIntroduction: result.content});
    } else {
        console.error('Failed to process result or unexpected result structure:', result);
        res.status(500).send('Failed to generate response');
    }
});


app.delete('/ai/flush-chat-data', async (req, res) => {
  if (!req.isAuthenticated() || !req.user || !req.user.id) {
    return res.status(401).send('User not authenticated.');
  }

  const userId = req.user.id;

  try {
    await pool.query('BEGIN'); 

    await pool.query('DELETE FROM chat_summaries WHERE user_id = $1', [userId]);

    await pool.query('UPDATE users SET num_chats = 0 WHERE id = $1', [userId]);

    await pool.query('COMMIT'); 

    res.send('AI chat data successfully purged and chat count reset.');
  } catch (error) {
    await pool.query('ROLLBACK'); 
    console.error('Failed to delete AI chat data and reset chat count:', error);
    res.status(500).send('Error purging AI chat data and resetting chat count.');
  }
});

const port = 3002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
