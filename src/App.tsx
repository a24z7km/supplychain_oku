/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Building2,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  X,
  ArrowLeft,
  Send,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { INITIAL_VENDORS } from './data';
import { Vendor, CheckItem, VendorStatus, ItemStatus } from './types';

export default function App() {
  // Central State: Shared between Z社 and A社 to show real-time demo updates
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [currentRole, setCurrentRole] = useState<'Z' | 'A'>('Z'); // 'Z' = 委託元 Z社, 'A' = 委託先 A社
  
  // Z社 Navigation State
  const [activeZMenu, setActiveZMenu] = useState<'refer' | 'request' | 'create' | 'others'>('refer');
  const [viewingVendorId, setViewingVendorId] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string>('All');
  
  // Z社 Comments/Queries inputs (keyed by item id)
  const [zComments, setZComments] = useState<Record<number, string>>({});
  
  // A社 Navigation State
  const [activeAMenu, setActiveAMenu] = useState<'answer' | 'tasks' | 'others'>('answer');
  const [isAnswering, setIsAnswering] = useState<boolean>(false); // Whether A社 opened the Z社 request form
  const [newEvidenceName, setNewEvidenceName] = useState<Record<number, string>>({});
  
  // Submission Success Banner State
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to show brief in-app notifications
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Find A社 specifically for easy reference on A社 side
  const vendorA = vendors.find(v => v.id === 'A')!;

  // Handlers for state updates
  const updateVendorStatus = (vendorId: string, status: VendorStatus) => {
    setVendors(prev =>
      prev.map(v => (v.id === vendorId ? { ...v, status, lastUpdated: getFormattedTime() } : v))
    );
    showToast(`${vendorId}社のステータスを「${status}」に更新しました`);
  };

  const updateItemAnswer = (itemId: number, answer: string) => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          const updatedItems = v.items.map(item => {
            if (item.id === itemId) {
              // Automatically switch status to answering if text is entered
              const nextStatus: ItemStatus = answer.trim() !== '' ? '回答中' : '依頼中';
              return { ...item, answer, status: nextStatus };
            }
            return item;
          });
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
  };

  const updateItemAssignee = (itemId: number, assignee: string) => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          const updatedItems = v.items.map(item =>
            item.id === itemId ? { ...item, assignee } : item
          );
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
  };

  const updateItemStatus = (itemId: number, status: ItemStatus) => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          const updatedItems = v.items.map(item =>
            item.id === itemId ? { ...item, status } : item
          );
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
  };

  const addEvidence = (itemId: number) => {
    const fileName = newEvidenceName[itemId]?.trim();
    if (!fileName) return;

    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          const updatedItems = v.items.map(item => {
            if (item.id === itemId) {
              if (item.evidence.includes(fileName)) {
                return item; // Avoid duplicates
              }
              return {
                ...item,
                evidence: [...item.evidence, fileName],
                status: '回答中' as ItemStatus
              };
            }
            return item;
          });
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
    setNewEvidenceName(prev => ({ ...prev, [itemId]: '' }));
    showToast(`証跡「${fileName}」を登録しました`);
  };

  const removeEvidence = (itemId: number, fileName: string) => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          const updatedItems = v.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                evidence: item.evidence.filter(f => f !== fileName)
              };
            }
            return item;
          });
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
    showToast(`証跡「${fileName}」を削除しました`);
  };

  // Z社 submits comment / additional query (更問)
  const submitZComment = (itemId: number, vendorId: string) => {
    const commentText = zComments[itemId]?.trim();
    if (!commentText) return;

    setVendors(prev =>
      prev.map(v => {
        if (v.id === vendorId) {
          const updatedItems = v.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                comment: commentText,
                isAdditionalQuery: true, // Marks as ✅ 追加確認対象
                status: '回答中' as ItemStatus // Move status back to answering so A社 has to review it
              };
            }
            return item;
          });
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );

    setZComments(prev => ({ ...prev, [itemId]: '' }));
    showToast(`更問（追加の質問）を送信しました。${vendorId}社側に「追加確認対象 ✅」として通知されます。`);
  };

  // Confirm item is fine (確認完了)
  const resolveAdditionalQuery = (itemId: number, vendorId: string) => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === vendorId) {
          const updatedItems = v.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                isAdditionalQuery: false,
                comment: '', // Clear comment or keep as history, let's clear for simplicity or note resolved
                status: '回答済' as ItemStatus
              };
            }
            return item;
          });
          return { ...v, items: updatedItems, lastUpdated: getFormattedTime() };
        }
        return v;
      })
    );
    showToast(`項目の確認を完了とし、追加確認対象マークを解除しました。`);
  };

  // Final submit from A社 (回答送信)
  const submitAllAnswersFromA = () => {
    setVendors(prev =>
      prev.map(v => {
        if (v.id === 'A') {
          // Set all items status to 回答済
          const updatedItems = v.items.map(item => ({
            ...item,
            status: '回答済' as ItemStatus
          }));
          return {
            ...v,
            items: updatedItems,
            status: '評価中' as VendorStatus, // Change overall vendor status to Evaluating/評価中
            lastUpdated: getFormattedTime()
          };
        }
        return v;
      })
    );
    setSubmitSuccess(true);
    setIsAnswering(false);
    showToast('全ての回答を送信しました！委託元（Z社）へ通知されました。');
    // Auto scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Filter vendors in Z社 dashboard
  const filteredVendors = vendors.filter(v => {
    if (vendorFilter === 'All') return true;
    return v.status === vendorFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col">
      
      {/* =========================================================================
          1. Stick-to-top Role Switcher Header (常時表示)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#001D6E] text-white shadow-md border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* System Title */}
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 rounded-md shadow-inner">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">TPRM Portal Pro</h1>
                <p className="text-[10px] text-blue-200 font-mono -mt-1 hidden sm:block">Third-Party Risk Management</p>
              </div>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex bg-blue-950 p-1 rounded-lg border border-blue-800 shadow-inner">
              <button
                id="role-switch-z"
                onClick={() => {
                  setCurrentRole('Z');
                  setSubmitSuccess(false);
                }}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  currentRole === 'Z'
                    ? 'bg-[#0031D8] text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-blue-900/40'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>委託元 (Z社)</span>
              </button>
              <button
                id="role-switch-a"
                onClick={() => {
                  setCurrentRole('A');
                  setSubmitSuccess(false);
                }}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  currentRole === 'A'
                    ? 'bg-[#0031D8] text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-blue-900/40'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>委託先 (A社)</span>
                {/* Visual badge indicator for task */}
                {vendorA.items.some(i => i.status !== '回答済' || i.isAdditionalQuery) && (
                  <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Simulated User Status Indicator */}
            <div className="hidden md:flex items-center space-x-2.5 text-xs text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="font-mono">
                {currentRole === 'Z' ? 'Z社：システム監査部 (監査担当)' : 'A社：セキュリティ管理部'}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Toast notifications */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border border-slate-700 max-w-md"
            >
              <Info className="h-4 w-4 text-blue-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            2. 委託元(Z社)側の画面群
            ========================================================================= */}
        {currentRole === 'Z' && (
          <div className="space-y-6">
            
            {/* Z社 Internal Navigation Menus */}
            <div className="border-b border-slate-200 flex flex-wrap justify-between items-center pb-2">
              <div className="flex space-x-1">
                <button
                  id="z-nav-refer"
                  onClick={() => {
                    setActiveZMenu('refer');
                    setViewingVendorId(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeZMenu === 'refer'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  回答参照
                </button>
                <button
                  id="z-nav-request"
                  onClick={() => setActiveZMenu('request')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeZMenu === 'request'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-400 hover:text-slate-500'
                  }`}
                >
                  回答依頼 <span className="text-[10px] text-slate-400">(未実装)</span>
                </button>
                <button
                  id="z-nav-create"
                  onClick={() => setActiveZMenu('create')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeZMenu === 'create'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-400 hover:text-slate-500'
                  }`}
                >
                  チェックリストの作成 <span className="text-[10px] text-slate-400">(未実装)</span>
                </button>
                <button
                  id="z-nav-others"
                  onClick={() => {
                    setActiveZMenu('others');
                    setViewingVendorId(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeZMenu === 'others'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  その他解説
                </button>
              </div>
              <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-xs hidden lg:block">
                <span>対象スコープ: グループ委託先基準 (SCS ★3相当)</span>
              </div>
            </div>

            {/* =========================================================
                Z社 SCREEN: 回答参照 (委託先一覧 ＆ 回答詳細)
                ========================================================= */}
            {activeZMenu === 'refer' && (
              <div>
                {viewingVendorId === null ? (
                  // 2.a 委託先一覧
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Visual Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-50 text-[#0031D8] rounded-lg">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">委託先登録数</p>
                          <p className="text-xl font-bold text-slate-900">{vendors.length}社</p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
                        <div className="p-2.5 bg-yellow-50 text-amber-600 rounded-lg">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">確認中 (未評価)</p>
                          <p className="text-xl font-bold text-slate-900">
                            {vendors.filter(v => v.status === '確認中').length}社
                          </p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">評価・審査中</p>
                          <p className="text-xl font-bold text-slate-900">
                            {vendors.filter(v => v.status === '評価中').length}社
                          </p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">評価完了</p>
                          <p className="text-xl font-bold text-slate-900">
                            {vendors.filter(v => v.status === '完了').length}社
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filter controls */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-500">ステータスで絞り込み:</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                          {['All', '依頼中', '確認中', '評価中', '完了'].map(filter => (
                            <button
                              key={filter}
                              onClick={() => setVendorFilter(filter)}
                              className={`px-3 py-1 rounded-md transition-all ${
                                vendorFilter === filter
                                  ? 'bg-white text-slate-900 font-medium shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {filter === 'All' ? 'すべて' : filter}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        現在 {filteredVendors.length} 社を表示
                      </span>
                    </div>

                    {/* Desktop Vendor Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="px-6 py-4">会社名</th>
                              <th className="px-6 py-4">対象チェックリスト</th>
                              <th className="px-6 py-4 text-center">回答進捗</th>
                              <th className="px-6 py-4">ステータス</th>
                              <th className="px-6 py-4">最終更新</th>
                              <th className="px-6 py-4">回答期限</th>
                              <th className="px-6 py-4 text-right">詳細アクション</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredVendors.map(vendor => {
                              const answeredCount = vendor.items.filter(i => i.status === '回答済').length;
                              const totalCount = vendor.items.length;
                              const progressPct = Math.round((answeredCount / totalCount) * 100);
                              const hasQuery = vendor.items.some(i => i.isAdditionalQuery);

                              return (
                                <tr key={vendor.id} className="hover:bg-slate-50/70 transition-all">
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-900 flex items-center space-x-2">
                                      <span>{vendor.name}</span>
                                      {hasQuery && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                          更問あり
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-1.5">
                                      <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                                      <span className="font-mono text-xs">{vendor.checklistName}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col items-center w-28 mx-auto">
                                      <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mb-1">
                                        <span>{answeredCount} / {totalCount} 項目</span>
                                        <span>{progressPct}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                          }`}
                                          style={{ width: `${progressPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        vendor.status === '確認中'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : vendor.status === '評価中'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : vendor.status === '完了'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full mr-1.5 bg-current animate-pulse"></span>
                                      {vendor.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                    {vendor.lastUpdated || '未更新'}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                    {vendor.dueDate}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      id={`view-vendor-${vendor.id}`}
                                      onClick={() => setViewingVendorId(vendor.id)}
                                      className="inline-flex items-center space-x-1 text-xs font-semibold bg-[#0031D8]/5 text-[#0031D8] border border-[#0031D8]/20 hover:bg-[#0031D8] hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                      <span>回答を確認</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* User Guide Box */}
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
                      <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">プロトタイプ解説：</span>
                        <span>
                          現在、「A社」は回答の編集・提出ができるシミュレーション対象です。
                          上部の「委託先(A社)」タブに切り替えて回答を入力、証跡を登録すると、
                          こちらの「Z社」画面にもリアルタイムで進捗や回答テキストが反映されます。
                        </span>
                      </div>
                    </div>

                  </motion.div>
                ) : (
                  // 2.b 回答詳細 (対象: A社 or 選択された会社)
                  (() => {
                    const vendor = vendors.find(v => v.id === viewingVendorId)!;
                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                      >
                        {/* Detail Header & Navigation back */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <button
                            id="back-to-list"
                            onClick={() => setViewingVendorId(null)}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer w-fit"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>一覧へ戻る</span>
                          </button>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Actions on detailed view */}
                            <button
                              onClick={() => showToast('回答再依頼メールを送信しました (デモのみ未実装)')}
                              className="px-3 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
                            >
                              回答再依頼 (未実装)
                            </button>
                            <button
                              onClick={() => showToast('承認申請ワークフローを起動しました (デモのみ未実装)')}
                              className="px-3 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
                            >
                              承認依頼 (未実装)
                            </button>
                          </div>
                        </div>

                        {/* Vendor Profile card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                              <h2 className="text-xl font-bold text-slate-900">{vendor.name}</h2>
                              <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">
                                {vendor.checklistName}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>回答期限: {vendor.dueDate}</span>
                              <span>最終更新: {vendor.lastUpdated || '未回答'}</span>
                            </div>
                          </div>

                          {/* INTERACTIVE VENDOR STATUS MANAGER */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                委託先セキュリティ評価状況
                              </label>
                              <span className="text-xs text-slate-500 font-medium">評価ステータスを変更：</span>
                            </div>
                            <select
                              id="vendor-status-select"
                              value={vendor.status}
                              onChange={(e) => updateVendorStatus(vendor.id, e.target.value as VendorStatus)}
                              className="bg-white border border-slate-300 rounded-md text-xs px-3 py-1.5 font-medium shadow-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0031D8] focus:border-[#0031D8]"
                            >
                              <option value="依頼中">依頼中 (未着手)</option>
                              <option value="確認中">確認中 (回答受領・精査中)</option>
                              <option value="評価中">評価中 (リスク査定中)</option>
                              <option value="完了">完了 (評価承認済み)</option>
                            </select>
                          </div>
                        </div>

                        {/* Audit check sheet details list */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                              <span>チェックシート回答一覧</span>
                              <span className="text-xs font-mono font-normal text-slate-400">({vendor.items.length} 項目)</span>
                            </h3>
                            <span className="text-xs text-slate-400">
                              各項目のステータスは回答内容や更問で自動的に遷移します。
                            </span>
                          </div>

                          {vendor.items.map((item, index) => {
                            const isA = vendor.id === 'A';
                            return (
                              <div
                                key={item.id}
                                className={`bg-white rounded-xl border shadow-2xs overflow-hidden transition-all duration-200 ${
                                  item.isAdditionalQuery
                                    ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/5'
                                    : 'border-slate-200'
                                }`}
                              >
                                {/* Card Header Block */}
                                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start sm:items-center space-x-2.5">
                                    <span className="text-xs font-bold font-mono bg-slate-200 text-slate-700 h-6 w-6 rounded-full flex items-center justify-center">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                                      <div className="flex items-center space-x-2 mt-0.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#0031D8]/5 text-[#0031D8] border border-[#0031D8]/10 font-mono">
                                          {item.guideline}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                          担当者: <strong className="text-slate-600 font-medium">{item.assignee}</strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right badges */}
                                  <div className="flex items-center space-x-2 shrink-0">
                                    {/* Additional Query Alert Badge */}
                                    {item.isAdditionalQuery && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200 shadow-3xs">
                                        追加確認対象 ✅
                                      </span>
                                    )}

                                    {/* Item state badge */}
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                        item.status === '回答済'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : item.status === '回答中'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Answers and Evidence */}
                                <div className="p-5 space-y-4">
                                  {/* Item Answer Text */}
                                  <div>
                                    <h5 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                                      委託先からの回答
                                    </h5>
                                    {item.answer ? (
                                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-800 leading-relaxed font-medium">
                                        {item.answer}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-slate-150 border-dashed">
                                        未入力（回答をお待ちください）
                                      </div>
                                    )}
                                  </div>

                                  {/* Evidence file attachment names list */}
                                  <div>
                                    <h5 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                                      提出証跡 (ファイル名登録形式)
                                    </h5>
                                    {item.evidence && item.evidence.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {item.evidence.map(file => (
                                          <div
                                            key={file}
                                            className="inline-flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-3xs space-x-1.5 text-xs text-slate-700 font-mono"
                                          >
                                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{file}</span>
                                            <span className="text-[10px] text-slate-300">|</span>
                                            <span className="text-[10px] text-slate-400">正常受領</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic">
                                        証跡ファイルは提出されていません
                                      </div>
                                    )}
                                  </div>

                                  {/* Comments and Additional Query Form */}
                                  <div className="pt-4 border-t border-slate-100">
                                    <h5 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center space-x-1">
                                      <span>Z社からの指摘事項・更問履歴</span>
                                    </h5>

                                    {/* Existing comments */}
                                    {item.comment && (
                                      <div className="mb-3 bg-amber-50/50 text-amber-900 text-xs p-3.5 rounded-lg border border-amber-200/60 leading-relaxed">
                                        <div className="font-bold flex items-center space-x-1 mb-1 text-amber-800">
                                          <AlertCircle className="h-3.5 w-3.5" />
                                          <span>追加質問（更問）内容:</span>
                                        </div>
                                        <p className="pl-4.5 font-medium">{item.comment}</p>
                                      </div>
                                    )}

                                    {/* Send comment form */}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                      <textarea
                                        rows={1}
                                        placeholder="役員承認や運用更新の証跡は年次で存在するか等、更問や補足事項を入力..."
                                        value={zComments[item.id] || ''}
                                        onChange={(e) =>
                                          setZComments(prev => ({ ...prev, [item.id]: e.target.value }))
                                        }
                                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#0031D8] focus:border-[#0031D8] focus:outline-none placeholder-slate-400"
                                      />
                                      <button
                                        id={`submit-comment-${item.id}`}
                                        disabled={!zComments[item.id]?.trim()}
                                        onClick={() => submitZComment(item.id, vendor.id)}
                                        className={`inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                          zComments[item.id]?.trim()
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                        }`}
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>更問を登録</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Item Audit Actions */}
                                  <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                                    <button
                                      onClick={() => {
                                        // Autofill sample query
                                        setZComments(prev => ({
                                          ...prev,
                                          [item.id]: '方針の役員承認がなされていることが分かる部分を、証跡の何ページ目から参照できるか指定してください。'
                                        }));
                                        showToast('更問のテンプレートを入力欄に挿入しました。右の更問ボタンで送信してください。');
                                      }}
                                      className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                                    >
                                      更問作成支援
                                    </button>

                                    {item.isAdditionalQuery && (
                                      <button
                                        id={`confirm-ok-${item.id}`}
                                        onClick={() => resolveAdditionalQuery(item.id, vendor.id)}
                                        className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center space-x-1 transition-all cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>確認完了 (更問解除)</span>
                                      </button>
                                    )}

                                    {!item.isAdditionalQuery && item.status === '回答済' && (
                                      <button
                                        onClick={() => showToast('この項目は監査上の確認を完了としました')}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold border border-slate-200 inline-flex items-center space-x-1 transition-all cursor-pointer"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>承認・確認済み</span>
                                      </button>
                                    )}
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Z社 SCREEN: 回答依頼 (未実装) */}
            {activeZMenu === 'request' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm"
              >
                <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">新規の回答依頼 (未実装)</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  この機能では、委託先に対して新規チェックシートの作成、対象組織の選定、および電子メール自動送付による回答要求トリガーを管理します。
                </p>
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-amber-700 border border-amber-100 inline-block">
                  プロトタイプの対象外機能（未実装）です。
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveZMenu('refer')}
                    className="px-4 py-2 bg-[#0031D8] text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                  >
                    回答参照（実装済み）に戻る
                  </button>
                </div>
              </motion.div>
            )}

            {/* Z社 SCREEN: チェックリストの作成 (未実装) */}
            {activeZMenu === 'create' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm"
              >
                <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">チェックリストマスタ作成 (未実装)</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  金融安全対策基準（SCS ★1〜★3）、政府統一基準、CIS Controls、NIST CSFなどの各種ガイドライン項目をインポート・編集して独自テンプレートを作成する機能です。
                </p>
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-amber-700 border border-amber-100 inline-block">
                  プロトタイプの対象外機能（未実装）です。
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveZMenu('refer')}
                    className="px-4 py-2 bg-[#0031D8] text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                  >
                    回答参照（実装済み）に戻る
                  </button>
                </div>
              </motion.div>
            )}

            {/* Z社 SCREEN: その他解説 */}
            {activeZMenu === 'others' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6"
              >
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-150 pb-2">
                  TPRM (第三者リスク管理) プロトタイプ運用ガイダンス
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                      <span>双方向のリアルタイムシミュレーション</span>
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      このデモツールは、委託元(Z社)と委託先(A社)の間でデータオブジェクトを共有しています。
                      上部の「委託先(A社)」で回答入力や証跡追加を行うと、その変更は内部のメモリ状態に保存され、
                      再度「委託元(Z社)」に切り替えた時に即座に反映されます。
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Z社側から更問を入力して更問送信ボタンを押した場合も、A社側の該当項目に警告マークと更問テキストが追加され、回答修正を促すフローを体験できます。
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                      <span>ステータス管理の対応関係</span>
                    </h4>
                    <table className="w-full text-xs text-slate-600 border border-slate-200 rounded-md overflow-hidden">
                      <thead className="bg-slate-50 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 border-r border-slate-200 text-left">ステータス種別</th>
                          <th className="p-2 text-left">意味と動作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr>
                          <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">依頼中 / 回答中</td>
                          <td className="p-2">委託先側が入力中で、まだ未確定または追加調査中。</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">回答済</td>
                          <td className="p-2">委託先が回答入力・証跡をセットして提出または確定。</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">追加確認対象 ✅</td>
                          <td className="p-2">委託元が内容不十分と判断し「更問」を設定した状態。</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start space-x-3 text-xs text-blue-800">
                  <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">検証用のアドバイス：</span>
                    <p className="mt-0.5 leading-relaxed">
                      1. 委託先(A社)タブに切り替え、お知らせから「回答する」を押します。<br />
                      2. 未入力の第3項目に「全関係先での体制図・責任分担を規定」などと回答し、証跡「distribution-map.pdf」を登録します。<br />
                      3. 下部の「回答送信」をクリックします。<br />
                      4. 再度 委託元(Z社)タブに戻り、A社が「評価中」ステータスになり、全項目が「回答済」かつ証跡が反映されていることを確認してください。
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        )}

        {/* =========================================================================
            3. 委託先(A社)側の画面群
            ========================================================================= */}
        {currentRole === 'A' && (
          <div className="space-y-6">

            {/* A社 Internal Navigation Menus */}
            <div className="border-b border-slate-200 flex flex-wrap justify-between items-center pb-2">
              <div className="flex space-x-1">
                <button
                  id="a-nav-answer"
                  onClick={() => {
                    setActiveAMenu('answer');
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeAMenu === 'answer'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  回答（チェックシート）
                </button>
                <button
                  id="a-nav-tasks"
                  onClick={() => setActiveAMenu('tasks')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeAMenu === 'tasks'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-400 hover:text-slate-500'
                  }`}
                >
                  残作業管理 <span className="text-[10px] text-slate-400">(未実装)</span>
                </button>
                <button
                  id="a-nav-others"
                  onClick={() => setActiveAMenu('others')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeAMenu === 'others'
                      ? 'border-[#0031D8] text-[#0031D8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  操作ヘルプ
                </button>
              </div>

              <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>委託元 Z社からの回答要請あり (期限: {vendorA.dueDate})</span>
              </div>
            </div>

            {/* A社 SCREEN: 回答＆案件ポータル */}
            {activeAMenu === 'answer' && (
              <div className="space-y-6">

                {/* Submit Success Toast Banner */}
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 shadow-sm flex items-start space-x-3"
                  >
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-900">回答の送信に成功しました</h4>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        すべてのセキュリティ回答および証跡情報を確定し、Z社（委託元）へ送信しました。
                        Z社のセキュリティ審査ポータル側の表示が「評価中」へ移行し、担当者の評価開始を待つ状態になっています。
                        更問（追加の質問）があった場合は通知バナーが表示されます。
                      </p>
                      <button
                        onClick={() => setSubmitSuccess(false)}
                        className="mt-2.5 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                      >
                        バナーを閉じる
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 1. 通知バナー (常時表示条件：未回答・更問がある場合、または通常) */}
                {!isAnswering && !submitSuccess && (
                  <motion.div
                    id="a-notice-banner"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-300 text-amber-900 text-sm p-4 rounded-xl flex items-start space-x-3 shadow-xs"
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold">重要なお知らせ:</span>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        回答依頼が1件きています。『回答』を開いてください。Z社より2026/09/30を期限とする安全評価回答の要求です。
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* If we are NOT in the active form answering view, show requests list card */}
                {!isAnswering ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-800">未送信の回答依頼</h3>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
                        1件進行中
                      </span>
                    </div>

                    {/* Request Item Row */}
                    <div className="p-6 divide-y divide-slate-100">
                      <div className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-[#0031D8] font-bold tracking-wider uppercase bg-[#0031D8]/5 px-2 py-0.5 rounded border border-[#0031D8]/10">
                              回答依頼: Z社
                            </span>
                            <span className="text-xs text-slate-400 font-mono">期限: {vendorA.dueDate}</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">
                            Z社システム利用に関するセキュリティチェックシート (基準: SCS ⭐︎3)
                          </h4>
                          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                            委託先A社として、セキュリティ方針・従業者教育・責任の境界に関して基準への適合性を回答してください。ファイル形式の証跡（安全宣言書、規約のPDF等）をアップロードできます。
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center space-x-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-slate-400 font-mono">現在の入力進捗</p>
                            <p className="text-sm font-bold text-slate-700">
                              {vendorA.items.filter(i => i.status === '回答済').length} / {vendorA.items.length} 完了
                            </p>
                          </div>
                          
                          <button
                            id="start-answering"
                            onClick={() => setIsAnswering(true)}
                            className="bg-[#0031D8] text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                          >
                            <span>回答する / 編集</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display warning summary if Z社 left additional questions */}
                      {vendorA.items.some(i => i.isAdditionalQuery) && (
                        <div className="pt-4 mt-2">
                          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200/80 flex items-start space-x-2.5 text-xs text-amber-900">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold block">⚠️ 委託元 Z社より、回答の修正または更問が届いています：</strong>
                              <p className="mt-1 leading-relaxed">
                                Z社審査官より指摘マーク「追加確認対象 ✅」が付与されています。回答を開き、コメントの内容に沿って再編集、または必要な証跡ファイル名を登録してください。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  // 2. A社 回答編集画面
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Header Controls */}
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                      <div className="flex items-center space-x-3">
                        <button
                          id="cancel-answering"
                          onClick={() => setIsAnswering(false)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer bg-white"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            Z社セキュリティ回答シート
                          </h3>
                          <p className="text-xs text-slate-500 font-mono -mt-0.5">基準: {vendorA.checklistName} (提出期限: {vendorA.dueDate})</p>
                        </div>
                      </div>

                      {/* Progress widget */}
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-mono">回答完了率</span>
                        <span className="text-sm font-bold text-slate-800">
                          {vendorA.items.filter(i => i.status === '回答済').length} / {vendorA.items.length} 項目
                        </span>
                      </div>
                    </div>

                    {/* Detailed Check Sheet Form List */}
                    <div className="space-y-6">
                      {vendorA.items.map((item, index) => {
                        return (
                          <div
                            key={item.id}
                            className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${
                              item.isAdditionalQuery
                                ? 'border-amber-400 ring-2 ring-amber-100'
                                : 'border-slate-200'
                            }`}
                          >
                            {/* Card Top Information */}
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start sm:items-center space-x-2.5">
                                <span className="text-xs font-bold font-mono bg-slate-200 text-slate-700 h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                                      {item.guideline}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Dropdown status update for item */}
                              <div className="flex items-center space-x-2.5 shrink-0">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  項目状況:
                                </label>
                                <select
                                  value={item.status}
                                  onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)}
                                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0031D8]"
                                >
                                  <option value="依頼中">依頼中</option>
                                  <option value="回答中">回答中</option>
                                  <option value="回答済">回答完了（回答済）</option>
                                </select>
                              </div>
                            </div>

                            {/* Card Edit Form Panel */}
                            <div className="p-5 space-y-4">
                              
                              {/* Z社 feedback highlighting */}
                              {item.isAdditionalQuery && (
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-900 text-xs leading-relaxed">
                                  <div className="font-bold flex items-center space-x-1 mb-1 text-amber-800">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>⚠️ Z社（委託元）からの更問・補足指示：</span>
                                  </div>
                                  <p className="pl-5 font-semibold text-slate-800">{item.comment}</p>
                                  <p className="mt-2 pl-5 text-[11px] text-amber-700 font-medium">
                                    回答テキストを補足修正するか、適切な証跡ファイルを追加して回答ステータスを「回答完了（回答済）」へ設定し直してください。
                                  </p>
                                </div>
                              )}

                              {/* 1. Answer text box */}
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                                  <span>回答記述欄 (自由入力)</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {item.answer ? `${item.answer.length} 文字` : '未入力'}
                                  </span>
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="方針名、最終更新日、承認者等の詳細を含めた回答を日本語で記述してください..."
                                  value={item.answer}
                                  onChange={(e) => updateItemAnswer(item.id, e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#0031D8] focus:border-[#0031D8] focus:outline-none placeholder-slate-400 font-medium"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* 2. Evidence uploading manager (証跡登録機能) */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700">
                                      提出証跡 (ファイル名登録形式)
                                    </label>
                                    <p className="text-[10px] text-slate-400">
                                      実アップロードは不要。ファイル名(例: `rules.pdf`)を入力して追加してください。
                                    </p>
                                  </div>

                                  {/* Uploaded file badges */}
                                  <div className="flex flex-wrap gap-1.5 min-h-6">
                                    {item.evidence && item.evidence.length > 0 ? (
                                      item.evidence.map(file => (
                                        <div
                                          key={file}
                                          className="inline-flex items-center bg-white border border-slate-250 rounded px-2.5 py-1 text-xs text-slate-700 font-mono shadow-2xs space-x-1.5"
                                        >
                                          <span>{file}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeEvidence(item.id, file)}
                                            className="text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 p-0.5 cursor-pointer"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">登録された証跡はありません</span>
                                    )}
                                  </div>

                                  {/* Add file input row */}
                                  <div className="flex space-x-1">
                                    <input
                                      type="text"
                                      placeholder="例: security-policy.pdf"
                                      value={newEvidenceName[item.id] || ''}
                                      onChange={(e) =>
                                        setNewEvidenceName(prev => ({ ...prev, [item.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addEvidence(item.id);
                                        }
                                      }}
                                      className="flex-1 bg-white border border-slate-300 rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-[#0031D8] focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => addEvidence(item.id)}
                                      className="bg-slate-700 text-white hover:bg-slate-800 rounded px-3 py-1.5 text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>追加</span>
                                    </button>
                                  </div>
                                </div>

                                {/* 3. Assignee details */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 flex flex-col justify-between">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      回答担当者登録
                                    </label>
                                    <p className="text-[10px] text-slate-400">
                                      社内の調査・回答取りまとめ責任者を指定します。
                                    </p>
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="担当者の氏名を入力..."
                                    value={item.assignee}
                                    onChange={(e) => updateItemAssignee(item.id, e.target.value)}
                                    className="bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 focus:ring-1 focus:ring-[#0031D8] focus:outline-none w-full"
                                  />

                                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                                    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>Z社（委託元）の画面にもリアルタイムに担当者が共有されます。</span>
                                  </div>
                                </div>

                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom sticky panel for entire submit actions */}
                    <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">回答の最終送信</h4>
                        <p className="text-xs text-slate-500 max-w-xl">
                          回答送信ボタンを押すと、すべての項目の状況が「回答済」に切り替わり、
                          Z社側のダッシュボードの状況が「確認中（要評価）」となります。
                        </p>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsAnswering(false)}
                          className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          一時保存（一覧へ）
                        </button>
                        <button
                          id="submit-answers-all"
                          type="button"
                          onClick={submitAllAnswersFromA}
                          className="px-5 py-2.5 bg-[#0031D8] text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-xs hover:shadow transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>回答送信 (Z社に提出)</span>
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}

              </div>
            )}

            {/* A社 SCREEN: 残作業管理 (未実装) */}
            {activeAMenu === 'tasks' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm"
              >
                <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">社内残作業管理 (未実装)</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  社内の他部署に対して証跡の取り寄せ依頼を発行したり、確認期限を自動リマインド通知したりする社内連携管理ツールです。
                </p>
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-amber-700 border border-amber-100 inline-block">
                  プロトタイプの対象外機能（未実装）です。
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveAMenu('answer')}
                    className="px-4 py-2 bg-[#0031D8] text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                  >
                    回答画面（実装済み）に戻る
                  </button>
                </div>
              </motion.div>
            )}

            {/* A社 SCREEN: 操作ヘルプ */}
            {activeAMenu === 'others' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5"
              >
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-150 pb-2">
                  委託先回答向けガイドライン
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-xs text-blue-900">
                    <span className="font-bold">委託先 (A社) に求められる役割：</span>
                    <p className="mt-1 leading-relaxed">
                      Z社（委託元）から依頼されるチェック項目は、組織情報セキュリティの最重要管理領域です。
                      回答は具体的にシステム名称や更新期間を記入し、それらを示す「証跡(ファイル名等)」を必ず提示することで、手戻り（更問）のない円滑な審査が期待できます。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm">回答および証跡登録のコツ</h4>
                    <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                      <li>
                        <strong>方針作成（SCS 1-1）</strong>: 「情報セキュリティ基本方針」のような基本方針書の有無が中心です。実運用と隔たりがないよう、承認日付のある文書名（例: <code>security-policy-2026.pdf</code>）を記載してください。
                      </li>
                      <li>
                        <strong>教育訓練（SCS 3-1）</strong>: 対象期間（例: 2025年度第2期）や修了率（例: 100%完了）を回答に記述し、受講履歴報告書名（例: <code>employee-training-report.pdf</code>）を登録してください。
                      </li>
                      <li>
                        <strong>責任分解（CIS Controls 1-9）</strong>: 委託契約書における免責、データ破棄、およびインシデント時連絡ルート等の役割分担が問われます。
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium font-mono">TPRM Check Sheet Prototype v1.0.0</span>
          </div>
          <span className="text-xs text-slate-400">
            © 2026 TPRMセキュアチェックシート. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
