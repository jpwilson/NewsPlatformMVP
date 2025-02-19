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
} from "@shared/schema";

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
    const id = this.currentId++;
    const newArticle = { 
      ...article, 
      id,
      createdAt: new Date(),
    };
    this.articles.set(id, newArticle);
    return newArticle;
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
      createdAt: new Date(),
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async listComments(articleId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.articleId === articleId
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
      (sub) => sub.channelId === channelId && sub.userId === userId
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

export const storage = new MemStorage();
