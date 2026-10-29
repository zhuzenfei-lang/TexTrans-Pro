import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { PdfBilingualViewer } from './components/PdfBilingualViewer.tsx';
import { ExcelBilingualViewer } from './components/ExcelBilingualViewer.tsx';
import { EmailAssistant } from './components/EmailAssistant.tsx';
import { GlossaryModal } from './components/GlossaryModal.tsx';
import { CloudDrivesModal, type CloudDriveProvider } from './components/CloudDrivesModal.tsx';
import { EmailHubModal, type EmailHubProvider } from './components/EmailHubModal.tsx';
import type { AppMode } from './types.ts';
import type { GmailMessageItem } from './lib/googleGmail.ts';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('excel');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isCloudDrivesOpen, setIsCloudDrivesOpen] = useState(false);
  const [cloudDriveDefaultTab, setCloudDriveDefaultTab] = useState<CloudDriveProvider>('googledrive');
  const [isEmailHubOpen, setIsEmailHubOpen] = useState(false);
  const [emailHubDefaultTab, setEmailHubDefaultTab] = useState<EmailHubProvider>('gmail');

  const [importedCloudFile, setImportedCloudFile] = useState<File | null>(null);
  const [importedGmailEmail, setImportedGmailEmail] = useState<GmailMessageItem | null>(null);

  // Directly pass imported file to the matching viewer
  const handleImportFromCloud = (
    file: File,
    category: 'pdf' | 'excel' | 'word' | 'image' | 'text'
  ) => {
    setImportedCloudFile(file);
    if (category === 'pdf') {
      setCurrentMode('pdf');
    } else if (category === 'excel') {
      setCurrentMode('excel');
    } else if (category === 'image') {
      if (currentMode === 'pdf') {
        setCurrentMode('pdf');
      } else {
        setCurrentMode('email');
      }
    } else {
      setCurrentMode('email');
    }
  };

  const handleImportFromEmail = (email: GmailMessageItem) => {
    setImportedGmailEmail(email);
    setCurrentMode('email');
  };

  const handleOpenGoogleDrive = () => {
    setCloudDriveDefaultTab('googledrive');
    setIsCloudDrivesOpen(true);
  };

  const handleOpenCloudHub = (tab: CloudDriveProvider = 'googledrive') => {
    setCloudDriveDefaultTab(tab);
    setIsCloudDrivesOpen(true);
  };

  const handleOpenGmail = () => {
    setEmailHubDefaultTab('gmail');
    setIsEmailHubOpen(true);
  };

  const handleOpenEmailHub = (tab: EmailHubProvider = 'gmail') => {
    setEmailHubDefaultTab(tab);
    setIsEmailHubOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenGoogleDrive={handleOpenGoogleDrive}
        onOpenGmail={handleOpenGmail}
        onOpenCloudDrives={() => handleOpenCloudHub('googledrive')}
        onOpenEmailHub={() => handleOpenEmailHub('gmail')}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {currentMode === 'pdf' && (
          <PdfBilingualViewer initialFile={importedCloudFile} />
        )}
        {currentMode === 'excel' && (
          <ExcelBilingualViewer initialFile={importedCloudFile} />
        )}
        {currentMode === 'email' && (
          <EmailAssistant
            importedEmail={importedGmailEmail}
            importedFile={importedCloudFile}
            onOpenGmail={handleOpenGmail}
            onOpenEmailHub={() => handleOpenEmailHub('gmail')}
          />
        )}
      </main>

      {/* Global Glossary Modal */}
      <GlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />

      {/* Multi-Cloud Drives Hub (Google Drive, OneDrive, Dropbox, Enterprise Link) */}
      <CloudDrivesModal
        isOpen={isCloudDrivesOpen}
        onClose={() => setIsCloudDrivesOpen(false)}
        onImportFile={handleImportFromCloud}
        defaultTab={cloudDriveDefaultTab}
      />

      {/* Multi-Email Hub (Gmail, Outlook, Tencent/Ali/163 Exmail & .EML) */}
      <EmailHubModal
        isOpen={isEmailHubOpen}
        onClose={() => setIsEmailHubOpen(false)}
        onImportEmail={handleImportFromEmail}
        defaultTab={emailHubDefaultTab}
      />
    </div>
  );
}
