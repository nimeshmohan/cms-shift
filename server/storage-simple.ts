// Temporary in-memory storage for server-side operations
// This works until we set up Firebase Admin SDK for server-side Firestore access

export class InMemoryStorage {
  private templates: Map<string, any> = new Map();
  private jobs: Map<string, any> = new Map();

  // Templates
  async getTemplates(userId: string) {
    return Array.from(this.templates.values()).filter(t => t.userId === userId);
  }

  async getTemplate(id: string, userId: string) {
    const template = this.templates.get(id);
    if (!template || template.userId !== userId) return null;
    return template;
  }

  async createTemplate(data: any) {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template = { ...data, id, createdAt: new Date() };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, userId: string, data: any) {
    const existing = await this.getTemplate(id, userId);
    if (!existing) throw new Error('Template not found');
    const updated = { ...existing, ...data };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string, userId: string) {
    const existing = await this.getTemplate(id, userId);
    if (!existing) throw new Error('Template not found');
    this.templates.delete(id);
  }

  // Jobs
  async getJobs(userId: string) {
    return Array.from(this.jobs.values()).filter(j => j.userId === userId);
  }

  async getJob(id: string, userId: string) {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) return null;
    return job;
  }

  async createJob(data: any) {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = { ...data, id, createdAt: new Date() };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: string, userId: string, data: any) {
    const existing = await this.getJob(id, userId);
    if (!existing) throw new Error('Job not found');
    const updated = { ...existing, ...data };
    this.jobs.set(id, updated);
    return updated;
  }
}

export const storage = new InMemoryStorage();

// Export with firestore-compatible interface name
export const firestoreStorage = storage;
