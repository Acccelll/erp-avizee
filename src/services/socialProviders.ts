export type SocialPlatform = 'instagram_business' | 'linkedin_page';

export interface SocialSyncPayload {
  contaId?: string;
}

export interface SocialSyncResult {
  success: boolean;
  message: string;
  syncedAt: string;
}

export interface SocialProvider {
  platform: SocialPlatform;
  syncInsights: (payload: SocialSyncPayload) => Promise<SocialSyncResult>;
}

class MockSocialProvider implements SocialProvider {
  constructor(public platform: SocialPlatform) {}

  async syncInsights(): Promise<SocialSyncResult> {
    return {
      success: true,
      message: `Sincronização mock concluída para ${this.platform}.`,
      syncedAt: new Date().toISOString(),
    };
  }
}

export function getSocialProvider(platform: SocialPlatform): SocialProvider {
  return new MockSocialProvider(platform);
}
