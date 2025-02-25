import { db } from './db';
import {
  users,
  channels,
  articles,
  comments,
  reactions,
  subscriptions,
  notes,
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
  InsertNote
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { IStorage } from './storage';

// Implement the storage interface using Drizzle with PostgreSQL
export const storage: IStorage = {
  // Users
  async getUser(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  },
  
  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result.length > 0 ? result[0] : null;
  },
  
  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  },
  
  // Channels
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const result = await db.insert(channels).values(channel).returning();
    return result[0];
  },
  
  async getChannel(id: number): Promise<Channel | null> {
    const result = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  },
  
  async listChannels(): Promise<Channel[]> {
    return await db.select().from(channels);
  },
  
  // Articles
  async createArticle(article: InsertArticle): Promise<Article> {
    const result = await db.insert(articles).values(article).returning();
    return result[0];
  },
  
  async getArticle(id: number): Promise<Article | null> {
    const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  },
  
  async listArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  },
  
  async updateArticle(id: number, update: Partial<Article>): Promise<Article> {
    const result = await db.update(articles)
      .set(update)
      .where(eq(articles.id, id))
      .returning();
      
    if (result.length === 0) {
      throw new Error("Article not found");
    }
    
    return result[0];
  },
  
  // Comments
  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    return result[0];
  },
  
  async listComments(articleId: number): Promise<Comment[]> {
    return await db.select()
      .from(comments)
      .where(eq(comments.articleId, articleId));
  },
  
  // Reactions
  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const result = await db.insert(reactions).values(reaction).returning();
    return result[0];
  },
  
  // Subscriptions
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const result = await db.insert(subscriptions).values(subscription).returning();
    return result[0];
  },
  
  async deleteSubscription(channelId: number, userId: number): Promise<void> {
    await db.delete(subscriptions)
      .where(
        and(
          eq(subscriptions.channelId, channelId),
          eq(subscriptions.userId, userId)
        )
      );
  },
  
  // Notes
  async createNote(note: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values(note).returning();
    return result[0];
  }
};