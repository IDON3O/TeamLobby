
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User as UserIcon, CheckCircle, Shield } from 'lucide-react';
import { User } from '../types';
import { updateUserProfile } from '../services/roomService';
import { useLanguage } from '../services/i18n';

interface ProfileProps {
    currentUser: User;
}

const Profile: React.FC<ProfileProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [nickname, setNickname] = useState(currentUser.nickname || currentUser.alias);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUserProfile(currentUser.id, { nickname });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (e) {
            alert(t('common.error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-gray-100 p-4 md:p-8 flex flex-col items-center">
            <div className="max-w-md w-full space-y-8">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-3 bg-surface hover:bg-gray-800 rounded-xl transition-colors border border-gray-800">
                        <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-2xl font-black tracking-tighter">{t('profile.title')}</h1>
                </header>

                <div className="bg-surface border border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="relative">
                            <img src={currentUser.avatarUrl} className="w-24 h-24 rounded-full border-4 border-primary shadow-lg shadow-primary/20" />
                            {currentUser.isAdmin && (
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-full border-4 border-surface">
                                    <Shield size={16} fill="currentColor" />
                                </div>
                            )}
                        </div>
                        <p className="text-sm font-bold text-gray-500">{currentUser.email || 'Guest User'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                            {t('profile.nickname')}
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <UserIcon size={18}/>
                            </div>
                            <input 
                                type="text" 
                                value={nickname} 
                                onChange={e => setNickname(e.target.value)}
                                className="w-full bg-black border border-gray-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary transition-all font-bold text-white shadow-inner"
                                placeholder={t('profile.nicknameHint')}
                            />
                        </div>
                        <p className="text-[10px] text-gray-600 px-1 font-medium">{t('profile.nicknameHint')}</p>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                            showSuccess 
                            ? 'bg-green-500 text-black shadow-green-500/20' 
                            : 'bg-primary text-white shadow-primary/20 hover:bg-violet-600'
                        }`}
                    >
                        {isSaving ? <span className="animate-pulse">...</span> : (
                            showSuccess ? <><CheckCircle size={18}/> {t('profile.updated')}</> : <><Save size={18}/> {t('common.save')}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
