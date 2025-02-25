import { IStorage } from "./storage";
import createMemoryStore from "memorystore";
import session from "express-session";
import {
  User,
  Channel,
  Article,
  Comment,
  Reaction,
  Subscription,
  Note,
  InsertUser,
  InsertChannel,
  InsertArticle,
  InsertComment,
  InsertReaction,
  InsertSubscription,
  InsertNote,
  channels,
  articles,
  users,
  comments,
  reactions,
  subscriptions,
  notes,
} from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannel(id: number): Promise<Channel | undefined>;
  listChannels(): Promise<Channel[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  getArticle(id: number): Promise<Article | undefined>;
  listArticles(): Promise<Article[]>;
  updateArticle(id: number, update: Partial<Article>): Promise<Article>;
  createComment(comment: InsertComment): Promise<Comment>;
  listComments(articleId: number): Promise<Comment[]>;
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  deleteSubscription(channelId: number, userId: number): Promise<void>;
  createNote(note: InsertNote): Promise<Note>;
}

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private channels: Map<number, Channel>;
  private articles: Map<number, Article>;
  private comments: Map<number, Comment>;
  private reactions: Map<number, Reaction>;
  private subscriptions: Map<number, Subscription>;
  private notes: Map<number, Note>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.channels = new Map();
    this.articles = new Map();
    this.comments = new Map();
    this.reactions = new Map();
    this.subscriptions = new Map();
    this.notes = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const id = this.currentId++;
    const newChannel = { ...channel, id };
    this.channels.set(id, newChannel);
    return newChannel;
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async listChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    try {
      // Remove createdAt completely and only handle the boolean
      const { published, ...restOfArticle } = article;
      
      // Create object without timestamp - let database default handle it
      const articleData = {
        ...restOfArticle,
        published: published ? 1 : 0
      };

      console.log("Simplified article data:", articleData);
      
      // Insert without specifying createdAt
      const [newArticle] = await db.insert(articles).values(articleData).returning();
      return newArticle;
    } catch (error) {
      console.error("Error in createArticle:", error);
      throw error;
    }
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async listArticles(): Promise<Article[]> {
    return Array.from(this.articles.values());
  }

  async updateArticle(id: number, update: Partial<Article>): Promise<Article> {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    const updatedArticle = { ...article, ...update };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentId++;
    const newComment = { 
      ...comment, 
      id,
      created_at: new Date(),
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async listComments(articleId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.article_id === articleId
    );
  }

  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const id = this.currentId++;
    const newReaction = { ...reaction, id };
    this.reactions.set(id, newReaction);
    return newReaction;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = this.currentId++;
    const newSubscription = { ...subscription, id };
    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async deleteSubscription(channelId: number, userId: number): Promise<void> {
    const subscription = Array.from(this.subscriptions.values()).find(
      (sub) => sub.channel_id === channelId && sub.user_id === userId
    );
    if (subscription) {
      this.subscriptions.delete(subscription.id);
    }
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = this.currentId++;
    const newNote = { ...note, id };
    this.notes.set(id, newNote);
    return newNote;
  }
}

export class DbStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const channel = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    return channel[0];
  }

  async listChannels(): Promise<Channel[]> {
    return await db.select().from(channels);
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    try {
      // Remove createdAt completely and only handle the boolean
      const { published, ...restOfArticle } = article;
      
      // Create object without timestamp - let database default handle it
      const articleData = {
        ...restOfArticle,
        published: published ? 1 : 0
      };

      console.log("Simplified article data:", articleData);
      
      // Insert without specifying createdAt
      const [newArticle] = await db.insert(articles).values(articleData).returning();
      return newArticle;
    } catch (error) {
      console.error("Error in createArticle:", error);
      throw error;
    }
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const article = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return article[0];
  }

  async listArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async updateArticle(id: number, update: Partial<Article>): Promise<Article> {
    const [updatedArticle] = await db.update(articles).set(update).where(eq(articles.id, id)).returning();
    if (!updatedArticle) throw new Error("Article not found");
    return updatedArticle;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values({
      ...comment,
      created_at: new Date(),
    }).returning();
    return newComment;
  }

  async listComments(articleId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.articleId, articleId));
  }

  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const [newReaction] = await db.insert(reactions).values(reaction).returning();
    return newReaction;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async deleteSubscription(channelId: number, userId: number): Promise<void> {
    await db.delete(subscriptions)
      .where(eq(subscriptions.channelId, channelId))
      .where(eq(subscriptions.userId, userId));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }
}

// Export the DbStorage instance for use with SQLite locally
export const storage = new DbStorage();