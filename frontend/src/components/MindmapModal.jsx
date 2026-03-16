import React, { useState, useEffect, useRef, useCallback } from 'react';
import API_BASE_URL from '../apiConfig';
import mermaid from 'mermaid';

const MindmapModal = ({ docName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hierarchy, setHierarchy] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
    const [zoom, setZoom] = useState(1);
    const [direction, setDirection] = useState('LR'); // TD or LR
    const chartRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                primaryColor: '#c7d2fe', // Soft Indigo Root
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#818cf8',
                lineColor: '#818cf8', // Indigo Curves
                secondaryColor: '#bfdbfe', // Light Blue First Level
                tertiaryColor: '#ffffff' // Leaf nodes
            },
            securityLevel: 'loose',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 16,
            flowchart: {
                htmlLabels: true,
                curve: 'basis',
                nodeSpacing: 50,
                rankSpacing: 90,
                padding: 20
            }
        });
    }, []);

    const fetchMindmap = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/mindmap/${encodeURIComponent(docName)}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to generate mind map');
            }
            const data = await response.json();
            
            const normalize = (n) => {
                if (typeof n === 'string') return { name: n };
                if (!n || typeof n !== 'object') return { name: String(n || 'Empty') };
                
                if (n.children && Array.isArray(n.children)) {
                    n.children = n.children.map(normalize);
                }
                return n;
            };

            const processedData = normalize(data);
            
            let idCounter = 0;
            const assignIds = (node) => {
                if (!node || typeof node !== 'object') return;
                node.id = idCounter === 0 ? 'root' : `node_${idCounter}`;
                idCounter++;
                if (node.children && Array.isArray(node.children)) {
                    node.children.forEach(assignIds);
                }
            };
            assignIds(processedData);
            
            setHierarchy(processedData);
            setExpandedNodes(new Set(['root']));
        } catch (err) {
            console.error('Error fetching Mind Map:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (docName) fetchMindmap();
    }, [docName]);

    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const generateMermaidCode = useCallback(() => {
        if (!hierarchy) return '';

        let code = `graph ${direction}\n`;
        code += `  classDef default fill:#ffffff,stroke:#cbd5e1,color:#1e293b,stroke-width:1.5px,font-size:14px,rx:12,ry:12;\n`;
        code += `  classDef root fill:#c7d2fe,stroke:#818cf8,color:#1e1b4b,font-weight:bold,font-size:18px,rx:20,ry:20;\n`;
        code += `  classDef expanded fill:#bfdbfe,stroke:#60a5fa,color:#1e3a8a,font-size:15px,rx:15,ry:15;\n`;
        code += `  classDef leaf fill:#ffffff,stroke:#e2e8f0,color:#475569,font-size:13px,rx:10,ry:10;\n`;

        const processNode = (node) => {
            const isExpanded = expandedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;
            
            let label = node.name.replace(/"/g, "'");
            if (hasChildren) {
                // Matching the < and > style from the user image
                label = isExpanded ? `< ${label}` : `${label} >`;
            }

            const styleClass = node.id === 'root' ? 'root' : (isExpanded ? 'expanded' : 'leaf');
            code += `  ${node.id}["${label}"]\n`;
            code += `  class ${node.id} ${styleClass}\n`;

            if (isExpanded && hasChildren) {
                node.children.forEach(child => {
                    code += `  ${node.id} --- ${child.id}\n`;
                    processNode(child);
                });
            }
        };

        processNode(hierarchy);
        return code;
    }, [hierarchy, expandedNodes, direction]);

    useEffect(() => {
        const renderChart = async () => {
            if (!loading && hierarchy && chartRef.current) {
                const code = generateMermaidCode();
                try {
                    chartRef.current.innerHTML = '';
                    const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, code);
                    chartRef.current.innerHTML = svg;

                    const nodes = chartRef.current.querySelectorAll('.node');
                    nodes.forEach(nodeEl => {
                        nodeEl.style.cursor = 'pointer';
                        nodeEl.style.transition = 'all 0.3s ease';
                        
                        // Extract the ID from the node element (Mermaid uses id="node_..." or similar)
                        const nodeId = nodeEl.id.replace(/^flowchart-/, '').split('-')[0];
                        
                        nodeEl.onclick = () => {
                            const findNodeById = (node) => {
                                if (node.id === nodeId) return node;
                                if (node.children) {
                                    for (const child of node.children) {
                                        const found = findNodeById(child);
                                        if (found) return found;
                                    }
                                }
                                return null;
                            };
                            
                            const targetNode = findNodeById(hierarchy);
                            if (targetNode && targetNode.children?.length) {
                                toggleNode(targetNode.id);
                            }
                        };
                    });
                } catch (err) {
                    console.error('Mermaid render error:', err);
                }
            }
        };
        renderChart();
    }, [loading, hierarchy, expandedNodes, direction, generateMermaidCode, toggleNode]);

    const handleZoom = (delta) => {
        setZoom(prev => Math.min(Math.max(0.4, prev + delta), 2.5));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/20 backdrop-blur-md transition-all duration-500 animate-in fade-in">
            <div 
                className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-10 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-indigo-100/30">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Interactive Mind Map</h2>
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {docName} • Zoom and Explore
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        {/* Layout Controls */}
                        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
                            <button 
                                onClick={() => setDirection('TD')}
                                className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${direction === 'TD' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Vertical
                            </button>
                            <button 
                                onClick={() => setDirection('LR')}
                                className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${direction === 'LR' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Horizontal
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 shadow-inner overflow-hidden">
                            <button onClick={() => handleZoom(-0.2)} className="w-10 h-10 hover:bg-white text-gray-400 hover:text-indigo-600 transition-all font-bold border-r border-gray-100">-</button>
                            <span className="px-5 text-[10px] font-bold text-gray-500 min-w-[70px] text-center uppercase tracking-widest">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => handleZoom(0.2)} className="w-10 h-10 hover:bg-white text-gray-400 hover:text-indigo-600 transition-all font-bold border-l border-gray-100">+</button>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100"
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div 
                    className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:32px_32px] relative"
                    ref={containerRef}
                >
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Constructing Logical Hierarchy...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100/50">
                                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Generation Failed</h3>
                            <p className="mt-2 max-w-sm text-gray-500 font-medium">{error}</p>
                            <button onClick={fetchMindmap} className="mt-8 px-8 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-xl transition-all border border-indigo-100 shadow-md">Retry Generation</button>
                        </div>
                    ) : (
                        <div 
                            className="transition-transform duration-300 ease-out inline-block min-w-full min-h-full p-20"
                            style={{ 
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div className="mermaid flex justify-center items-center scale-up" ref={chartRef}></div>
                        </div>
                    )}
                </div>

                {/* Footer Controls / Legend */}
                <div className="px-10 py-5 border-t border-gray-100 bg-white/80 backdrop-blur-md flex justify-between items-center">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Main Concept</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-sky-100 border-2 border-sky-400"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Section</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-200"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Detail Node</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-10 py-3 premium-gradient text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95"
                    >
                        Close Map
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MindmapModal;
