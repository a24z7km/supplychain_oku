/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vendor, CheckItem } from './types';

export const INITIAL_ITEMS_A: CheckItem[] = [
  {
    id: 1,
    title: '方針が作成されているか',
    answer: '作成して、年1で更新中',
    status: '回答済',
    evidence: ['security-policy-2026.pdf'],
    guideline: 'SCS 1-1',
    assignee: '佐藤 陽一',
    comment: '',
    isAdditionalQuery: false,
  },
  {
    id: 2,
    title: '社員教育が実施されているか',
    answer: 'E-learningにて毎年実施',
    status: '回答済',
    evidence: ['employee-training-report.pdf', 'security-curriculum-v2.pdf'],
    guideline: 'SCS 3-1',
    assignee: '鈴木 健太',
    comment: '',
    isAdditionalQuery: false,
  },
  {
    id: 3,
    title: '情報漏洩時の責任分解の整理がされているか',
    answer: '',
    status: '依頼中',
    evidence: [],
    guideline: 'CIS Controls 1-9',
    assignee: '未設定',
    comment: '',
    isAdditionalQuery: false,
  },
];

// Simple mock items for B and C, so the Z社 view has complete data
export const INITIAL_ITEMS_B: CheckItem[] = [
  {
    id: 1,
    title: '方針が作成されているか',
    answer: '作成済み（ISMS認証取得済み）',
    status: '回答済',
    evidence: ['isms-certificate.pdf'],
    guideline: 'SCS 1-1',
    assignee: '山田 花子',
    comment: '前回のISMS審査報告書も追加で提出してください。',
    isAdditionalQuery: true, // Marked as additional confirmation by default
  },
  {
    id: 2,
    title: '社員教育が実施されているか',
    answer: '新入社員向けにのみ入社時実施',
    status: '回答済',
    evidence: ['training-deck.pptx'],
    guideline: 'SCS 3-1',
    assignee: '山田 花子',
    comment: '',
    isAdditionalQuery: false,
  },
  {
    id: 3,
    title: '情報漏洩時の責任分解の整理がされているか',
    answer: '契約書別紙にて規定済み',
    status: '回答済',
    evidence: ['master-service-agreement-exhibit-c.pdf'],
    guideline: 'CIS Controls 1-9',
    assignee: '山田 花子',
    comment: '',
    isAdditionalQuery: false,
  },
];

export const INITIAL_ITEMS_C: CheckItem[] = [
  {
    id: 1,
    title: '方針が作成されているか',
    answer: '',
    status: '依頼中',
    evidence: [],
    guideline: 'SCS 1-1',
    assignee: '未設定',
    comment: '',
    isAdditionalQuery: false,
  },
  {
    id: 2,
    title: '社員教育が実施されているか',
    answer: '',
    status: '依頼中',
    evidence: [],
    guideline: 'SCS 3-1',
    assignee: '未設定',
    comment: '',
    isAdditionalQuery: false,
  },
  {
    id: 3,
    title: '情報漏洩時の責任分解の整理がされているか',
    answer: '',
    status: '依頼中',
    evidence: [],
    guideline: 'CIS Controls 1-9',
    assignee: '未設定',
    comment: '',
    isAdditionalQuery: false,
  },
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'A',
    name: 'A社',
    status: '確認中',
    dueDate: '2026/09/30',
    checklistName: 'SCS ⭐︎3',
    items: INITIAL_ITEMS_A,
    lastUpdated: '2026/07/01 15:30',
  },
  {
    id: 'B',
    name: 'B社',
    status: '評価中',
    dueDate: '2026/08/15',
    checklistName: 'SCS ⭐︎3',
    items: INITIAL_ITEMS_B,
    lastUpdated: '2026/06/25 10:20',
  },
  {
    id: 'C',
    name: 'C社',
    status: '依頼中',
    dueDate: '2026/10/15',
    checklistName: 'SCS ⭐︎3',
    items: INITIAL_ITEMS_C,
    lastUpdated: '2026/06/30 09:00',
  },
];
