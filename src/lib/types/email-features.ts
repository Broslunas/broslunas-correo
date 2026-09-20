export interface SelfDestructConfig {
  enabled: boolean;
  expiresAt?: string | null;
  maxViews?: number | null;
  viewCount?: number;
  isBurned?: boolean;
}

export interface UnsubscribeInfo {
  hasUnsubscribe: boolean;
  type?: 'mailto' | 'http' | 'one-click';
  url?: string;
  mailto?: string;
}

export interface SharedEmailRecord {
  token: string;
  emailId: string;
  creatorEmail: string;
  expiresAt: Date | null;
  passwordHash?: string;
  passwordSalt?: string;
  hideSensitive: boolean;
  allowAttachments: boolean;
  views: number;
  createdAt: Date;
  revoked: boolean;
}

export interface GrammarStyleIssue {
  id: string;
  type: 'spelling' | 'style' | 'clarity' | 'duplicate';
  text: string;
  replacement: string;
  message: string;
}
