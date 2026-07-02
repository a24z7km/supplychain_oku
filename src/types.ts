/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ItemStatus = '依頼中' | '回答中' | '回答済';
export type VendorStatus = '確認中' | '評価中' | '依頼中' | '完了';

export interface CheckItem {
  id: number;
  title: string;
  answer: string;
  status: ItemStatus;
  evidence: string[]; // List of file names
  guideline: string;
  assignee: string;
  comment: string;
  isAdditionalQuery: boolean; // "追加確認対象 ✅" flag
}

export interface Vendor {
  id: string;
  name: string;
  status: VendorStatus;
  dueDate: string;
  checklistName: string;
  items: CheckItem[];
  lastUpdated?: string;
}
