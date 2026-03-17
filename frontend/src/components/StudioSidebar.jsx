import React from 'react';

const StudioSidebar = ({ selectedDocs, onShowBirdseye, onShowMindmap }) => {
    const actions = [
        {
            id: 'birdseye',
            name: "Bird's-Eye View",
            description: "Deep document synthesis and key insights.",
            icon: (
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            color: 'bg-indigo-50',
            action: () => onShowBirdseye(selectedDocs[0])
        },
        {
            id: 'mindmap',
            name: "Mind Map",
            description: "Interactive hierarchical knowledge graph.",
            icon: (
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-purple-50',
            action: () => onShowMindmap(selectedDocs[0])
        }
    ];

    return (
        <div className="studio-sidebar">
            <div className="p-6 pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">Studio</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">AI Tools</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {selectedDocs.length === 0 ? (
                    <div className="text-center py-12 px-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-500">Select a source to unlock Studio tools</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {actions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={action.action}
                                    disabled={selectedDocs.length === 0}
                                    className="w-full text-left p-4 content-card group relative"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                                            {action.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-gray-800">{action.name}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{action.description}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedDocs.length > 1 && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="text-[10px] text-amber-700 font-medium leading-normal">
                                    <span className="font-bold">Note:</span> Actions are focused on the first selected document: <span className="italic">{selectedDocs[0]}</span>
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
};

export default StudioSidebar;
