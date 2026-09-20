export interface SelfDestructConfig {
  enabled: boolean;
  token?: string;
  expiresAt?: string | null;
  maxViews?: number | null;
  viewCount?: number;
  isBurned?: boolean;
}

export interface SelfDestructRecord {
  token: string;
  emailId?: string;
  senderEmail: string;
  senderName?: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    r2Url: string;
  }>;
  maxViews?: number | null;
  viewCount: number;
  expiresAt?: Date | null;
  createdAt: Date;
  isBurned: boolean;
  burnedAt?: Date | null;
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
