'use client';
import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { sendChatMessage } from '@/utils/loanChat';
import { generateTTS } from '@/utils/tts';
import { LANGUAGES } from '@/components/LoanGuide/data';
import { transcribeAudio } from '@/utils/stt';
import { Mic, Headphones, MessageCircle, ChevronDown, ArrowRight, GitBranch, GitCommit, GitPullRequest, LayoutGrid, PieChart, BarChart, List, Box, ChevronLeft, CheckCircle2 } from 'lucide-react';

// Define and export the Message type
export type Message = {
  text: string;
  sender: 'user' | 'bot';
};

// Define the loan application stages
const LOAN_STAGES = [
  {
    title: "Information Collection",
    description: "Basic details and requirements",
    icon: Box
  },
  {
    title: "Loan Assessment",
    description: "Evaluating loan options",
    icon: BarChart
  },
  {
    title: "Final Approval",
    description: "Loan offer and completion",
    icon: CheckCircle2
  }
];

// Define stage keywords for better detection
const STAGE_KEYWORDS = {
  INITIAL: ['name', 'age', 'profession', 'personal', 'details', 'information', 'basic'],
  ASSESSMENT: ['evaluate', 'income', 'salary', 'credit', 'bank', 'statement', 'documents', 'verify'],
  APPROVAL: ['approve', 'offer', 'sanction', 'grant', 'confirm', 'congratulation', 'success']
};

// Define supported language codes
type LanguageCode = 'hi-IN' | 'kn-IN' | 'te-IN' | 'ta-IN' | 'mr-IN' | 'ml-IN' | 'gu-IN' | 'en-IN';

// Define multilingual greetings
const GREETINGS: Record<LanguageCode, string> = {
  'hi-IN': 'नमस्ते! मैं आपका लोन सलाहकार हूं। आपको सही लोन विकल्प जल्दी से खोजने में मदद करने के लिए, मुझे बस आपका नाम, आयु और पेशा जानने की जरूरत है। आपका नाम क्या है?',
  'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಸಾಲದ ಸಲಹೆಗಾರ. ನಿಮಗೆ ಸರಿಯಾದ ಸಾಲದ ಆಯ್ಕೆಗಳನ್ನು ಶೀಘ್ರವಾಗಿ ಕಂಡುಹಿಡಿಯಲು ಸಹಾಯ ಮಾಡಲು, ನಾನು ನಿಮ್ಮ ಹೆಸರು, ವಯಸ್ಸು ಮತ್ತು ವೃತ್ತಿಯನ್ನು ತಿಳಿಯಬೇಕು. ನಿಮ್ಮ ಹೆಸರೇನು?',
  'te-IN': 'నమస్కారం! నేను మీ రుణ సలహాదారును. మీకు సరైన రుణ ఎంపికలను త్వరగా కనుగొనడంలో సహాయపడటానికి, నేను మీ పేరు, వయస్సు మరియు వృత్తిని తెలుసుకోవాలి. మీ పేరు ఏమిటి?',
  'ta-IN': 'வணக்கம்! நான் உங்கள் கடன் ஆலோசகர். உங்களுக்கு சரியான கடன் விருப்பங்களை விரைவாகக் கண்டறிய உதவ, உங்கள் பெயர், வயது மற்றும் தொழில் பற்றி தெரிந்துகொள்ள வேண்டும். உங்கள் பெயர் என்ன?',
  'mr-IN': 'नमस्कार! मी तुमचा कर्ज सल्लागार आहे. तुम्हाला योग्य कर्ज पर्याय लवकर शोधण्यात मदत करण्यासाठी, मला तुमचे नाव, वय आणि व्यवसाय जाणून घेणे आवश्यक आहे. तुमचे नाव काय आहे?',
  'ml-IN': 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ വായ്പാ ഉപദേശകനാണ്. നിങ്ങൾക്ക് ശരിയായ വായ്പാ ഓപ്ഷനുകൾ വേഗത്തിൽ കണ്ടെത്താൻ സഹായിക്കുന്നതിന്, എനിക്ക് നിങ്ങളുടെ പേര്, വയസ്സ്, തൊഴിൽ എന്നിവ അറിയേണ്ടതുണ്ട്. നിങ്ങളുടെ പേര് എന്താണ്?',
  'gu-IN': 'નમસ્તે! હું તમારો લોન સલાહકાર છું. તમને યોગ્ય લોન વિકલ્પો ઝડપથી શોધવામાં મદદ કરવા માટે, મારે તમારું નામ, ઉંમર અને વ્યવસાય જાણવાની જરૂર છે. તમારું નામ શું છે?',
  'en-IN': 'Hello! I\'m your loan advisor. To help you find the right loan options quickly, I just need your name, age, and profession to get started. What\'s your name?'
};

// LoanProgressStepper Component
const LoanProgressStepper = ({ currentStage }: { currentStage: number }) => {
  return (
    <div className="bg-white px-6 py-4 border-b border-gray-200">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${(currentStage / (LOAN_STAGES.length - 1)) * 100}%` }}
            />
          </div>
          
          {/* Stages */}
          <div className="relative flex justify-between">
            {LOAN_STAGES.map((stage, index) => {
              const StageIcon = stage.icon;
              const isCompleted = index < currentStage;
              const isActive = index === currentStage;
              
              return (
                <div key={index} className="flex flex-col items-center relative">
                  {/* Stage Icon */}
                  <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 bg-white ${
                    isCompleted ? 'border-blue-500 text-blue-500' :
                    isActive ? 'border-blue-500 text-blue-500' :
                    'border-gray-300 text-gray-400'
                  }`}>
                    <StageIcon className="w-5 h-5" />
                  </div>
                  
                  {/* Stage Content */}
                  <div className="mt-2 text-center">
                    <h4 className={`text-sm font-medium ${
                      isCompleted || isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stage.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-[120px]">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(10000); // Start with 10 seconds
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Initialize audio context and analyser
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // Adjust for better frequency resolution

      // Create a script processor node for real-time audio analysis
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
    }
  };

  // Start conversation when language is selected
  useEffect(() => {
    if (selectedLanguage) {
      startConversation();
    }
  }, [selectedLanguage]);

  const startConversation = async () => {
    try {
      setIsProcessing(true);
      const greeting = GREETINGS[selectedLanguage as LanguageCode] || GREETINGS['en-IN'];
      setMessages(prev => [...prev, { text: greeting, sender: 'bot' }]);
      await generateTTS(selectedLanguage!, greeting);
      
      // Start recording after a short delay
      setTimeout(() => {
        startRecording();
      }, 2000); // 2 second delay after welcome message
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (isTTSPlaying) return; // Don't start recording if TTS is playing
    
    try {
      initAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Connect audio stream to analyser
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      source.connect(analyserRef.current!);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        processAudio(audioBlob);
      };

      // Voice activity detection using ScriptProcessorNode
      scriptProcessorRef.current!.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        let volume = 0;
        for (let i = 0; i < inputData.length; i++) {
          volume += Math.abs(inputData[i]);
        }
        volume /= inputData.length;

        if (volume > 0.02) { // Adjust threshold as needed
          if (!isRecording && mediaRecorderRef.current!.state !== 'recording') {
            mediaRecorderRef.current!.start();
            setIsRecording(true);
          }
        } else if (isRecording && mediaRecorderRef.current!.state === 'recording') {
          mediaRecorderRef.current!.stop();
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Set timeout for automatic stop using current duration
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, recordingDuration);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Enhanced stage update function
  const updateCurrentStage = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    // Only allow moving to next stage or staying in current stage
    let newStage = currentStage;
    
    // Check for keywords in each stage
    if (STAGE_KEYWORDS.ASSESSMENT.some(keyword => lowerMessage.includes(keyword))) {
      newStage = Math.max(currentStage, 1);
    } else if (STAGE_KEYWORDS.APPROVAL.some(keyword => lowerMessage.includes(keyword))) {
      newStage = Math.max(currentStage, 2);
    }
    
    // Update stage with animation
    if (newStage !== currentStage) {
      setCurrentStage(newStage);
    }
  };

  // Modify processAudio to include stage updates
  const processAudio = async (audioBlob: Blob) => { 
    try {
      setIsProcessing(true);
      const sttResponse = await transcribeAudio(audioBlob, selectedLanguage!);
      
      if (sttResponse?.transcript) {
        setMessages(prev => [...prev, { text: sttResponse.transcript, sender: 'user' }]);
        await processUserMessage(sttResponse.transcript);
        updateCurrentStage(sttResponse.transcript);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playTTS = async (languageCode: string, text: string) => {
    try {
      setIsTTSPlaying(true);
      
      // Split text into sentences or chunks of max 200 characters
      const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
      const chunks = [];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= 200) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      // Process each chunk sequentially
      for (const chunk of chunks) {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': '47b5a700-2f9e-4e1d-afe0-c46ed9cda77e',
          },
          body: JSON.stringify({
            inputs: [chunk],
            target_language_code: languageCode,
            speaker: 'meera',
            pace: 1.0,
            loudness: 1.0,
          }),
        });

        const data = await response.json();
        if (data.audios && data.audios.length > 0) {
          const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`);
          
          // Stop recording if it's active
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }

          // Wait for this chunk to finish playing
          await new Promise<void>((resolve) => {
            audio.play();
            audio.onended = () => resolve();
          });
        }
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      throw error;
    } finally {
      setIsTTSPlaying(false);
    }
  };

  // Add a function to calculate recording duration
  const calculateRecordingDuration = (response: string) => {
    const wordCount = response.split(' ').length;
    
    // Base duration + additional time per word
    const baseDuration = 5000; // 5 seconds minimum
    const perWordDuration = 200; // 200ms per word
    const maxDuration = 30000; // 30 seconds maximum
    
    const calculatedDuration = baseDuration + (wordCount * perWordDuration);
    return Math.min(calculatedDuration, maxDuration);
  };

  // Modify processUserMessage to update recording duration
  const processUserMessage = async (message: string) => {
    try {
      const response = await sendChatMessage('12345', message, selectedLanguage!);
      setMessages(prev => [...prev, { text: response, sender: 'bot' }]);
      
      // Calculate new recording duration based on response length
      const newDuration = calculateRecordingDuration(response);
      setRecordingDuration(newDuration);
      
      await playTTS(selectedLanguage!, response);
      
      // Restart recording after TTS completes
      setTimeout(() => {
        startRecording();
      }, 1000); // 1 second delay after TTS
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  const checkAudioLevel = () => {
    if (!analyserRef.current || !mediaRecorderRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const volume = Math.max(...dataArray);

    if (volume > 20) { // Adjust threshold as needed
      if (!isRecording && mediaRecorderRef.current.state !== 'recording') {
        mediaRecorderRef.current.start();
        setIsRecording(true);
      }
    } else if (isRecording && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Add cleanup for timeout
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  // // Add auto-scroll effect
  // useEffect(() => {
  //   if (messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [messages]);

  // Add new function to process chat history
  const generateVisualization = async () => {
    try {
      setIsVisualizing(true);
      const response = await fetch('/api/visualize-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      const data = await response.json();
      setVisualizationData(data.visualization);
    } catch (error) {
      console.error('Error generating visualization:', error);
    } finally {
      setIsVisualizing(false);
    }
  };

  // Add new visualization components
  const VisualizationPanel = () => (
    <div className="mt-6 bg-white rounded-lg shadow-lg p-6 overflow-y-auto max-h-[400px]">
      <div className="grid grid-cols-1 gap-8">
        {/* Summary Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Conversation Summary</h3>
          <p className="text-gray-700">{visualizationData.summary}</p>
        </div>

        {/* Flow Chart Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversation Flow</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {visualizationData.flowChart.nodes.map((node: any) => (
              <div key={node.id} className={`p-3 rounded-lg ${
                node.type === 'start' ? 'bg-green-50' : 
                node.type === 'question' ? 'bg-blue-50' : 'bg-purple-50'
              }`}>
                <div className="text-sm font-medium text-gray-800">{node.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Block Diagram Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Concepts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visualizationData.blockDiagram.sections.map((section: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">{section.title}</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {section.content.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Graphs Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visualizationData.graphs.map((graph: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">{graph.title}</h4>
                <div className="h-40 bg-white rounded">
                  <div className="flex items-end h-full gap-1 p-2">
                    {graph.data.values.map((value: number, i: number) => (
                      <div 
                        key={i}
                        style={{ height: `${value}%` }}
                        className="flex-1 bg-blue-400 rounded-t"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Add function to generate summary
  const generateSummary = async () => {
    try {
      setIsSummarizing(true);
      setSummaryData(null); // Reset previous data
      setIsSummaryOpen(true);
      
      const response = await fetch('/api/summarize-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      const data = await response.json();
      setSummaryData(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummaryData(null);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Summary Panel Component
  const SummaryPanel = () => (
    <div className="fixed inset-y-0 left-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setIsSummaryOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold">Conversation Summary</h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSummarizing ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : summaryData ? (
            <>
              {/* Summary Section */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
                <p className="text-gray-600">{summaryData.summary || 'No summary available'}</p>
              </div>

              {/* Key Points Flow */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">Key Points</h4>
                <div className="space-y-2">
                  {summaryData.keyPoints?.map((point: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full">
                        {index + 1}
                      </div>
                      <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-800">{point}</span>
                      </div>
                      {index < (summaryData.keyPoints?.length || 0) - 1 && (
                        <ArrowRight className="w-5 h-5 text-gray-400 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No summary data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {/* Summary Panel */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${
        isSummaryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <SummaryPanel />
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Language Selection */}
        {!selectedLanguage ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <MessageCircle className="w-12 h-12 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Select your preferred language</h2>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-gray-700">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Progress Stepper */}
            {/* <LoanProgressStepper currentStage={currentStage} /> */}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Status Bar */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="h-10 flex items-center justify-center text-sm text-gray-500">
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-500 animate-pulse" />
                    <span>Processing your request...</span>
                  </div>
                ) : isRecording ? (
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-500 animate-bounce" />
                    <span>Listening...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-blue-500" />
                    <span>Ready to assist</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Button */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
              <button
                onClick={generateSummary}
                disabled={isProcessing || messages.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <List className="w-5 h-5" />
                <span>Summarize Chat</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 