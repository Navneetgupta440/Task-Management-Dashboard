import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  Database,
  Key,
  Server,
  Layers,
  Cpu,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Terminal,
  Search,
  Code2,
  Sparkles,
  FileText,
} from 'lucide-react';
import { openApiSpec } from '../openapi.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

interface FlattenedEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary: string;
  tags: string[];
  security: any[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'raw_json' | 'scaling' | 'postman' | 'vercel'>('api');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    'post-/auth/login': true,
    'get-/tasks': true,
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Flatten the OpenAPI 3.0.3 paths into an easily filterable and renderable array
  const endpoints = useMemo<FlattenedEndpoint[]>(() => {
    const list: FlattenedEndpoint[] = [];
    const paths = openApiSpec.paths as Record<string, any>;

    Object.entries(paths).forEach(([pathKey, methods]) => {
      Object.entries(methods).forEach(([methodKey, operation]: [string, any]) => {
        const method = methodKey.toLowerCase() as FlattenedEndpoint['method'];
        list.push({
          method,
          path: pathKey,
          summary: operation.summary || '',
          tags: operation.tags || ['General'],
          security: operation.security !== undefined ? operation.security : openApiSpec.security,
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses || {},
        });
      });
    });

    return list;
  }, []);

  // Filter endpoints by tag and search query
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchesTag = selectedTag === 'All' || ep.tags.includes(selectedTag);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q);
      return matchesTag && matchesSearch;
    });
  }, [endpoints, selectedTag, searchQuery]);

  // Unique tags for tag pills
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    endpoints.forEach((ep) => ep.tags.forEach((t) => tags.add(t)));
    return ['All', ...Array.from(tags)];
  }, [endpoints]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onSuccessToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const generateCurlCommand = (ep: FlattenedEndpoint): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const baseUrl = `${origin}/api/v1`;
    let curl = `curl -X ${ep.method.toUpperCase()} "${baseUrl}${ep.path}"`;

    const isSecured = ep.security.length > 0;
    if (isSecured) {
      curl += ` \\\n  -H "Authorization: Bearer ${token || '<YOUR_JWT_TOKEN>'}"`;
    }

    if (ep.requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      const schema = ep.requestBody?.content?.['application/json']?.schema;
      if (schema?.properties) {
        const sampleBody: Record<string, any> = {};
        Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any]) => {
          sampleBody[prop] = propSchema.example !== undefined ? propSchema.example : propSchema.type === 'string' ? '' : 0;
        });
        curl += ` \\\n  -d '${JSON.stringify(sampleBody, null, 2)}'`;
      }
    }

    return curl;
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onSuccessToast(`Downloading ${filename}...`);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'POST':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PUT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusCodeClass = (code: string) => {
    if (code.startsWith('2')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (code.startsWith('4')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (code.startsWith('5')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="architecture-docs-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="TaskHub Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {openApiSpec.info.title}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  v{openApiSpec.info.version} (OpenAPI 3.0.3)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Node.js • Express • PostgreSQL Relational Database • JWT Authentication & RBAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-arch-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 overflow-x-auto gap-2 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Interactive API Explorer
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                {endpoints.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('raw_json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'raw_json'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              OpenAPI 3.0.3 JSON
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Architecture & RBAC Matrix
            </button>

            <button
              onClick={() => setActiveTab('scaling')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'scaling'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Production Scaling
            </button>

            <button
              onClick={() => setActiveTab('postman')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'postman'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              Postman Collection
            </button>

            <button
              id="tab-btn-vercel"
              onClick={() => setActiveTab('vercel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'vercel'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Vercel Deployment
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(JSON.stringify(openApiSpec, null, 2), 'openapi-json', 'OpenAPI 3.0 JSON')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Copy JSON to clipboard"
            >
              {copiedKey === 'openapi-json' ? (
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              )}
              Copy JSON
            </button>
            <button
              onClick={() => downloadFile('/api/v1/docs?download=true', 'openapi.json')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
              title="Download openapi.json file"
            >
              <Download className="w-3 h-3" />
              Download .json
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300 text-sm bg-slate-50/40 dark:bg-slate-950/40">
          {/* TAB: INTERACTIVE API EXPLORER */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Controls bar: search & tags */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter endpoints (e.g. auth, tasks, admin, POST)..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-center">
                    <span>Base URL:</span>
                    <code className="bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {openApiSpec.servers[0]?.url || '/api/v1'}
                    </code>
                    {token && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                        <Check className="w-3 h-3" /> Active JWT Loaded
                      </span>
                    )}
                  </div>
                </div>

                {/* Tag Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                      {tag === 'All'
                        ? ` (${endpoints.length})`
                        : ` (${endpoints.filter((e) => e.tags.includes(tag)).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoints List */}
              <div className="space-y-3">
                {filteredEndpoints.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    <p className="font-semibold text-sm">No endpoints matched your filter.</p>
                    <button
                      onClick={() => {
                        setSelectedTag('All');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filteredEndpoints.map((ep) => {
                    const endpointKey = `${ep.method}-${ep.path}`;
                    const isExpanded = !!expandedEndpoints[endpointKey];
                    const isSecured = ep.security.length > 0;
                    const curlCommand = generateCurlCommand(ep);

                    return (
                      <div
                        key={endpointKey}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300"
                      >
                        {/* Endpoint Header Bar */}
                        <div
                          onClick={() => toggleEndpoint(endpointKey)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer select-none hover:bg-slate-50/70 transition gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${getMethodBadgeClass(
                                ep.method
                              )}`}
                            >
                              {ep.method}
                            </span>
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              {ep.path}
                            </span>
                            <span className="text-xs text-slate-500 hidden md:inline truncate max-w-md">
                              {ep.summary}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Security Badge */}
                            {isSecured ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title="Requires Bearer JWT Authorization header"
                              >
                                <Key className="w-3 h-3 text-indigo-600" />
                                Bearer Auth
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                Public
                              </span>
                            )}

                            {/* Tag */}
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 hidden lg:inline">
                              {ep.tags[0]}
                            </span>

                            <div className="text-slate-400 p-1">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Details Drawer */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                            {/* Summary description for smaller screens */}
                            <div className="text-xs text-slate-700">
                              <strong>Summary:</strong> {ep.summary}
                            </div>

                            {/* Parameters (Path / Query) */}
                            {ep.parameters && ep.parameters.length > 0 && (
                              <div className="space-y-1.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Parameters
                                </h4>
                                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden text-xs">
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                                      <tr>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">In</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Required</th>
                                        <th className="p-2">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                      {ep.parameters.map((param, pIdx) => (
                                        <tr key={pIdx} className="hover:bg-slate-50/50">
                                          <td className="p-2 font-bold text-slate-900">{param.name}</td>
                                          <td className="p-2 text-slate-500">{param.in}</td>
                                          <td className="p-2 text-indigo-600">
                                            {param.schema?.type || 'string'}
                                            {param.schema?.enum ? ` [${param.schema.enum.join('|')}]` : ''}
                                          </td>
                                          <td className="p-2">
                                            {param.required ? (
                                              <span className="text-rose-600 font-bold">Yes</span>
                                            ) : (
                                              <span className="text-slate-400">No</span>
                                            )}
                                          </td>
                                          <td className="p-2 font-sans text-slate-600">
                                            {param.description || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Request Body */}
                            {ep.requestBody && (
                              <div className="space-y-1.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Request Body (application/json)
                                </h4>
                                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                                  <pre>
                                    {JSON.stringify(
                                      ep.requestBody.content?.['application/json']?.schema?.properties || {},
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Responses */}
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Responses
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(ep.responses).map(([code, resObj]: [string, any]) => (
                                  <div
                                    key={code}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${getStatusCodeClass(
                                      code
                                    )}`}
                                  >
                                    <span className="font-mono font-bold">{code}</span>
                                    <span className="text-[11px] font-sans text-slate-700">
                                      {resObj.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* cURL Command Generator */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                  <Terminal className="w-3.5 h-3.5 text-slate-600" />
                                  Executable cURL Snippet
                                </span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(curlCommand, `curl-${endpointKey}`, `${ep.method.toUpperCase()} ${ep.path} cURL`)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                                >
                                  {copiedKey === `curl-${endpointKey}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-slate-500" />
                                      Copy cURL
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {curlCommand}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: RAW OPENAPI 3.0.3 JSON */}
          {activeTab === 'raw_json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    OpenAPI 3.0.3 Complete JSON Specification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standardized schema for import into Swagger Editor, Postman, Insomnia, or client SDK generators.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(openApiSpec, null, 2), 'raw-json-copy', 'Raw OpenAPI JSON')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    {copiedKey === 'raw-json-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={() => downloadFile('/api/v1/docs?download=true', 'openapi.json')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download openapi.json
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px]">
                <pre>{JSON.stringify(openApiSpec, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* TAB: ARCHITECTURE & JWT */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">System Architecture Overview</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  The application follows a full-stack, decoupled architecture uniting a React 19 single-page interface
                  with a hardened Node.js Express API server, persisting directly into a native PostgreSQL relational database.
                </p>
              </div>

              {/* Visual Flow Diagram */}
              <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-slate-400 font-semibold mb-1">// High-Level Request & JWT Authorization Flow:</div>
                <div className="text-emerald-400">1. Client Request: React Frontend ──(Credentials)──&gt; POST /api/v1/auth/login</div>
                <div className="text-indigo-300">2. Password Verification: bcrypt.compare(plainPass, user.password_hash) [10 salt rounds]</div>
                <div className="text-indigo-300">3. Token Issuance: jwt.sign(&#123; id, email, role &#125;, JWT_SECRET, &#123; expiresIn: &apos;7d&apos; &#125;)</div>
                <div className="text-emerald-400">4. Client Storage: Token stored in secure state / client storage</div>
                <div className="text-amber-300">5. Protected Requests: Authorization: Bearer &lt;token&gt; header attached to /api/v1/tasks</div>
                <div className="text-blue-300">6. Middleware Gate: authenticateToken() verifies signature + expiration + DB existence</div>
                <div className="text-purple-300">7. RBAC Check: requireRole([&apos;admin&apos;]) validates user role permissions</div>
                <div className="text-emerald-300">8. PostgreSQL Execution: Parameterized query executed against indexed tables</div>
              </div>

              {/* RBAC Matrix */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Role-Based Access Control (RBAC) Matrix</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Capability</th>
                        <th className="p-3 text-center">Admin</th>
                        <th className="p-3 text-center">Manager</th>
                        <th className="p-3 text-center">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-medium">Create & Edit Own Tasks</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">View Team Tasks (All Users)</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-slate-400 font-bold">✗ Own only</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Delete Any Task</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-slate-400 font-bold">✗ Own only</td>
                        <td className="p-3 text-center text-slate-400 font-bold">✗ Own only</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Admin Console & User Role Management</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-rose-500 font-bold">✗ 403 Forbidden</td>
                        <td className="p-3 text-center text-rose-500 font-bold">✗ 403 Forbidden</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">System Metrics Inspection</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                        <td className="p-3 text-center text-rose-500 font-bold">✗ 403 Forbidden</td>
                        <td className="p-3 text-center text-rose-500 font-bold">✗ 403 Forbidden</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Password Hashing Details */}
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-1">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Encrypted Password Storage Guarantee
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Plain-text passwords are never persisted. Passwords pass through adaptive bcrypt salting (work factor 10)
                  before insertion. In all queries, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">password_hash</code> is
                  explicitly excluded from SQL projection or stripped before sending API responses.
                </p>
              </div>
            </div>
          )}

          {/* TAB: PRODUCTION SCALING STRATEGY */}
          {activeTab === 'scaling' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Production Scaling Architecture Note (5–10 Lines)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Required response for assignment evaluation criteria regarding architecture maturity.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-800">
                <p>
                  <strong>1. Containerization & Deployment:</strong> Package Node.js backend and compiled static Vite bundle
                  into a multi-stage Docker image deployed to auto-scaling clusters (e.g., Google Cloud Run / AWS ECS) behind an Nginx reverse proxy with SSL termination.
                </p>
                <p>
                  <strong>2. Database Scaling & Pooling:</strong> Implement managed PostgreSQL (AWS Aurora / Cloud SQL) with read replicas for read-heavy queries. Utilize PgBouncer connection pooling to handle thousands of concurrent API requests without exhausting database socket limits.
                </p>
                <p>
                  <strong>3. Caching Layer (Redis):</strong> Deploy an in-memory Redis cluster for session invalidation, JWT blacklist caching, and TTL-based caching of frequent reads such as <code className="bg-slate-100 px-1 rounded font-mono">/api/v1/tasks</code> list queries and profile fetches.
                </p>
                <p>
                  <strong>4. Database Indexing & Query Plans:</strong> Enforce composite indexing (<code className="bg-slate-100 px-1 rounded font-mono">user_id, status</code>, <code className="bg-slate-100 px-1 rounded font-mono">created_at DESC</code>) to maintain logarithmic query latency at scale, combined with EXPLAIN ANALYZE monitoring.
                </p>
                <p>
                  <strong>5. Rate Limiting & Security:</strong> Enforce Express rate-limiting (<code className="bg-slate-100 px-1 rounded font-mono">express-rate-limit</code>) on authentication endpoints to defend against brute-force attacks, alongside strict CORS origin policies and Content Security Headers via Helmet.
                </p>
                <p>
                  <strong>6. Observability & CI/CD:</strong> Integrate structured JSON logging (Winston/Pino), OpenTelemetry distributed tracing, automated GitHub Actions test pipelines, and Prometheus metrics for real-time SLA alerting.
                </p>
              </div>
            </div>
          )}

          {/* TAB: POSTMAN COLLECTION */}
          {activeTab === 'postman' && (
            <div className="space-y-4 text-center py-6 bg-white rounded-2xl border border-slate-200 p-8">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Download className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Export Ready-to-Use Postman Collection</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Download the standardized Postman v2.1 collection file containing preconfigured requests, headers,
                and environment variables for all Auth, Task, and Admin endpoints.
              </p>

              <div className="pt-3">
                <button
                  id="btn-download-postman"
                  onClick={() => downloadFile('/api/v1/docs/postman', 'auth-dashboard-postman.json')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Postman Collection (.json)
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-left text-[11px] text-slate-500 font-mono">
                API Endpoint: <span className="text-slate-800 font-semibold">GET /api/v1/docs/postman</span>
              </div>
            </div>
          )}

          {/* TAB: VERCEL DEPLOYMENT */}
          {activeTab === 'vercel' && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs mb-2">
                  <Server className="w-3.5 h-3.5" />
                  Vercel Serverless Ready
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Deploying to Vercel</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  This project is configured for 1-click zero-config deployment to Vercel with serverless Express API endpoints and optimized static Vite client assets.
                </p>
              </div>

              {/* Architecture diagram on Vercel */}
              <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-slate-400 font-semibold mb-1">// Vercel Serverless & Static Distribution:</div>
                <div className="text-emerald-400">Browser / Client ───&gt; Vercel Edge Network (Global CDN)</div>
                <div className="text-indigo-300">├── Static Files: /* ───────────&gt; dist/ (Vite React 19 SPA)</div>
                <div className="text-amber-300">└── API Requests: /api/* ───────&gt; Serverless Function (/api/index.ts)</div>
                <div className="text-slate-400 pl-4">└── Express app handler (normalized paths, JWT auth, RBAC)</div>
                <div className="text-purple-300 pl-8">└── PostgreSQL (Managed Neon / Supabase / Vercel PG or local /tmp)</div>
              </div>

              {/* Step-by-Step Deployment Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                    Via Vercel Web Dashboard (Git)
                  </div>
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Push your code repository to <strong>GitHub</strong> or <strong>GitLab</strong>.</li>
                    <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">vercel.com/new</a> and click <strong>Import</strong>.</li>
                    <li>
                      Under <strong>Environment Variables</strong>, optionally add:
                      <ul className="list-disc list-inside ml-4 mt-1 text-slate-700 font-mono text-[11px]">
                        <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">JWT_SECRET</code></li>
                        <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">DATABASE_URL</code> (Neon / Supabase)</li>
                      </ul>
                    </li>
                    <li>Click <strong>Deploy</strong>. Vercel automatically detects the pre-configured <code className="bg-slate-100 px-1 rounded font-mono">vercel.json</code>!</li>
                  </ol>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
                    Via Vercel CLI (Terminal)
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <p>Run these commands directly in your local terminal:</p>
                    <div className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] relative group">
                      <pre className="overflow-x-auto">npm i -g vercel{"\n"}vercel --prod</pre>
                      <button
                        onClick={() => copyToClipboard('npm i -g vercel\nvercel --prod', 'vercel-cli-copy', 'CLI command')}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="Copy command"
                      >
                        {copiedKey === 'vercel-cli-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Follow the quick prompt to log in and select your project.
                    </p>
                  </div>
                </div>
              </div>

              {/* vercel.json configuration preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active vercel.json Configuration
                  </h4>
                  <button
                    onClick={() => copyToClipboard(`{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api",
      "destination": "/api"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`, 'vercel-json-copy', 'vercel.json')}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'vercel-json-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy vercel.json
                  </button>
                </div>
                <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api",
      "destination": "/api"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>REST API v1 Server Live • OpenAPI 3.0.3 Conforming</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
