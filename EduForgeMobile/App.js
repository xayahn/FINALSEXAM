import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, 
  Button, ScrollView, Platform, ActivityIndicator, 
  RefreshControl, Modal, SafeAreaView, StatusBar, Switch, Image, KeyboardAvoidingView, Alert, Dimensions, Linking 
} from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons'; 
import * as DocumentPicker from 'expo-document-picker'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import axios from 'axios';
import { login as apiLogin } from './src/api';

// ⚠️ CONNECTION SETTINGS
// Use 'http://127.0.0.1:8000' for Web. Use 'http://10.0.2.2:8000' for Android Emulator.
// BASE_URL should be the root of your backend (no trailing slash). API_URL will point to the /api/ namespace.
const BASE_URL = (
  (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) ||
  (typeof window !== 'undefined' && (window.REACT_APP_API_URL || window.API_URL)) ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '');

const API_URL = `${BASE_URL}/api`;

// --- DESIGN SYSTEM ---
const ThemeContext = createContext();
const lightTheme = { 
  bg: '#F8FAFC', card: '#FFFFFF', text: '#1E293B', sub: '#64748B', 
  primary: '#4F46E5', primaryLight: '#E0E7FF', accent: '#F59E0B', 
  border: '#E2E8F0', success: '#10B981', error: '#EF4444',
  shadow: Platform.select({
    web: { boxShadow: '0px 4px 8px rgba(100, 116, 139, 0.1)' },
    default: { shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpsxacity: 0.05, shadowRadius: 8, elevation: 3 }
  })
};
const darkTheme = { 
  bg: '#0F172A', card: '#1E293B', text: '#F1F5F9', sub: '#94A3B8', 
  primary: '#818CF8', primaryLight: 'rgba(99, 102, 241, 0.2)', accent: '#FBBF24', 
  border: '#334155', success: '#34D399', error: '#F87171',
  shadow: Platform.select({
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }
  })
};

const Stack = createStackNavigator();

// --- COMPONENTS ---
const CustomAlert = ({ visible, title, message, type, onClose, theme }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.alertOverlay}>
      <View style={[styles.alertBox, {backgroundColor: theme.card}]}>
        <View style={[styles.alertIconBox, { backgroundColor: type === 'success' ? '#D1FAE5' : '#FEE2E2' }]}>
           <Ionicons name={type === 'success' ? "checkmark" : "alert"} size={32} color={type === 'success' ? '#059669' : '#DC2626'} />
        </View>
        <Text style={[styles.alertTitle, {color: theme.text}]}>{title}</Text>
        <Text style={[styles.alertMessage, {color: theme.sub}]}>{message}</Text>
        <TouchableOpacity style={[styles.alertBtn, {backgroundColor: theme.primary}]} onPress={onClose}>
          <Text style={styles.alertBtnText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const Header = ({ title, subtitle, onBack, rightAction, theme }) => (
  <View style={[styles.headerContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
    <View style={{flexDirection:'row', alignItems:'center'}}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
      )}
      <View>
        <Text style={[styles.headerTitle, {color: theme.text}]} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={[styles.headerSubtitle, {color: theme.sub}]}>{subtitle}</Text>}
      </View>
    </View>
    {rightAction}
  </View>
);

const Card = ({ children, style, onPress, theme }) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container onPress={onPress} style={[styles.card, theme.shadow, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </Container>
  );
};

// Logout helper button (uses auth logout from context)
function LogoutButton({ navigation }) {
  const { theme, logout } = useContext(ThemeContext);
  return (
    <TouchableOpacity onPress={() => logout(navigation)} style={{width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center'}}>
      <Ionicons name="log-out-outline" size={20} color={theme.error} />
    </TouchableOpacity>
  );
}

// --- SCREEN 0: LOGIN ---
function LoginScreen({ navigation }) {
  const { theme, setAuthToken, setAuthUser, registerPushToken } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  
  const passwordRef = useRef(null);

  const handleLogin = () => {
    if (!username || !password) return setAlert({visible:true, title:'Missing Info', message:'Please enter username and password.', type: 'error'});
    setLoading(true);
    apiLogin(username, password)
      .then(async (res) => {
        setLoading(false);
        // Defensive handling: ensure server returned user and token
        const user = res?.user;
        const token = res?.token;
        if (!user || !token) {
          console.error('Unexpected login response', res.data);
          setAlert({ visible: true, title: 'Login Failed', message: 'Invalid response from server.', type: 'error' });
          return;
        }
        const role = user.is_staff ? 'teacher' : 'student';
        try {
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          setAuthToken && setAuthToken(token);
          setAuthUser && setAuthUser(user);
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
          // register push token (best-effort)
          registerPushToken && registerPushToken(token);
        } catch (e) { console.log('Login store error', e); }
        navigation.replace('Home', { userRole: role, userName: user.username, userId: user.id });
      })
      .catch((err) => {
        setLoading(false);
        console.error('Login error', err);
        const msg = err?.body?.error || err?.message || (err.response?.data?.error) || "Unable to connect to server.";
        setAlert({visible:true, title:'Login Failed', message: msg, type:'error'});
      });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
      <View style={{flex:1, backgroundColor: theme.bg, justifyContent:'center', padding: 24}}>
        <StatusBar barStyle={theme === lightTheme ? "dark-content" : "light-content"} />
        <CustomAlert {...alert} theme={theme} onClose={()=>setAlert({...alert, visible:false})} />
        
        <View style={{alignItems:'center', marginBottom: 40}}>
          <View style={{width: 80, height: 80, borderRadius: 20, backgroundColor: theme.primary, justifyContent:'center', alignItems:'center', marginBottom: 16}}>
             <Ionicons name="school" size={40} color="white" />
          </View>
          <Text style={{fontSize:32, fontWeight:'800', color: theme.text}}>EduForge</Text>
          <Text style={{fontSize:16, color: theme.sub, marginTop: 4}}>LMS Platform</Text>
        </View>

        <Card theme={theme} style={{padding: 24}}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput 
            style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} 
            placeholder="Username" 
            placeholderTextColor={theme.sub}
            value={username} onChangeText={setUsername} autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          
          <Text style={[styles.label, {marginTop: 16}]}>PASSWORD</Text>
          <TextInput 
            ref={passwordRef}
            style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} 
            placeholder="Password" 
            placeholderTextColor={theme.sub}
            value={password} onChangeText={setPassword} secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary, marginTop: 24}]} onPress={handleLogin}>
            {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </Card>
        
        <View style={{flexDirection:'row', justifyContent:'center', marginTop: 24}}>
           <Text style={{color: theme.sub}}>New here? </Text>
           <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{color: theme.primary, fontWeight:'bold'}}>Create an Account</Text>
           </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- SCREEN 0.5: REGISTER ---
function RegisterScreen({ navigation }) {
  const { theme, setAuthToken, setAuthUser, registerPushToken } = useContext(ThemeContext);
  const [form, setForm] = useState({ username:'', email:'', password:'', first_name:'', teacher_code:'' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error', onSuccess: null });

  const handleRegister = () => {
    if(!form.username || !form.password || !form.email) return setAlert({visible:true, title:'Missing Fields', message:'Please fill all required fields.', type: 'error'});
    setLoading(true);
    
    axios.post(`${API_URL}/auth/register/`, form).then(async (res) => {
      setLoading(false);
      // Defensive: ensure server returned expected fields
      const token = res.data?.token;
      const user = res.data?.user || null;
      if (!token || !user) {
        console.error('Unexpected register response', res.data);
        setAlert({ visible: true, title: 'Registration Failed', message: 'Invalid response from server.', type: 'error' });
        return;
      }
      try {
        if (token) {
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          setAuthToken && setAuthToken(token);
          setAuthUser && setAuthUser(user);
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
          registerPushToken && registerPushToken(token);
        }
      } catch (e) { console.log('Register store error', e); }

      setAlert({visible:true, title:"Success", message:"Account created successfully.", type:"success", onSuccess:()=>navigation.goBack()});
    }).catch(err => {
      setLoading(false);
      console.error('Register error', err);
      const msg = err.response?.data?.username ? "Username taken." : (err.message || "Registration failed.");
      setAlert({visible:true, title:"Error", message: msg, type: 'error'});
    });
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} theme={theme} onClose={() => { setAlert({ ...alert, visible: false }); if (alert.onSuccess) alert.onSuccess(); }} />
      <Header title="Create Account" subtitle="Join EduForge Today" onBack={() => navigation.goBack()} theme={theme} />
      
      <ScrollView contentContainerStyle={{padding: 24}}>
        <Card theme={theme} style={{padding: 20}}>
          <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} placeholder="Username" placeholderTextColor={theme.sub} value={form.username} onChangeText={t=>setForm({...form, username:t})} autoCapitalize="none" />
          <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginTop: 12}]} placeholder="Email Address" placeholderTextColor={theme.sub} value={form.email} onChangeText={t=>setForm({...form, email:t})} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginTop: 12}]} placeholder="Full Name (Optional)" placeholderTextColor={theme.sub} value={form.first_name} onChangeText={t=>setForm({...form, first_name:t})} />
          <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginTop: 12}]} placeholder="Password" placeholderTextColor={theme.sub} value={form.password} onChangeText={t=>setForm({...form, password:t})} secureTextEntry />
          
          <View style={{marginVertical: 20, padding: 16, backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed'}}>
             <Text style={{color: theme.sub, fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1}}>INSTRUCTOR ACCESS</Text>
             <TextInput style={[styles.input, {backgroundColor: theme.card, color: theme.text, borderColor: theme.border}]} placeholder="Secret Teacher Code" placeholderTextColor={theme.sub} value={form.teacher_code} onChangeText={t=>setForm({...form, teacher_code:t})} secureTextEntry />
          </View>

          <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary}]} onPress={handleRegister}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Complete Registration</Text>}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- SCREEN 1: DASHBOARD ---
function HomeScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { userRole, userName, userId } = route.params;
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  useFocusEffect(useCallback(() => { fetchCourses(); fetchNotifications(); }, []));

  const fetchCourses = () => {
    axios.get(`${API_URL}/courses/`).then(res => {
       setCourses(res.data);
       setRefreshing(false);
    }).catch(() => setRefreshing(false));

    if(userRole === 'student') {
        axios.get(`${API_URL}/enrollments/`).then(res => {
            setMyEnrollments(res.data.filter(e => e.student === userId));
        });
    }
  };

  const fetchNotifications = () => {
      axios.get(`${API_URL}/notifications/`).then(res => {
          const unread = res.data.filter(n => !n.is_read).length;
          setUnreadCount(unread > 0 ? unread : 0);
      }).catch(err => console.log('No Notifs'));
  };

  const displayCourses = courses.map(c => {
      const enrollment = myEnrollments.find(e => e.course === c.id);
      return { ...c, isEnrolled: !!enrollment, progress: enrollment ? enrollment.progress : 0 };
  });

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
      <StatusBar barStyle={theme === lightTheme ? 'dark-content' : 'light-content'} backgroundColor={theme.bg} />
      
      {/* Dashboard Header */}
      <View style={{padding: 24, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <View>
          <Text style={{fontSize: 24, fontWeight: '800', color: theme.text}}>Hi, {userName} 👋</Text>
          <Text style={{fontSize: 14, color: theme.sub, marginTop: 4}}>{userRole === 'teacher' ? 'Instructor Dashboard' : 'Student Portal'}</Text>
        </View>
    <View style={{flexDirection: 'row', alignItems:'center'}}>
            {/* 🔴 RED DOT NOTIFICATION */}
            <TouchableOpacity onPress={()=>navigation.navigate('Notifications')} style={{marginRight: 16}}>
                <View>
                  <Ionicons name="notifications-outline" size={24} color={theme.text} />
                  {unreadCount > 0 && (
                      <View style={{position: 'absolute', right: 0, top: 0, backgroundColor: theme.error, width: 10, height: 10, borderRadius: 5, borderWidth:1, borderColor: theme.card}} />
                  )}
                </View>
            </TouchableOpacity>
      <LogoutButton navigation={navigation} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{padding: 20}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchCourses();}} tintColor={theme.primary} />}
      >
        {/* Quick Actions Grid */}
        <View style={{flexDirection: 'row', marginBottom: 24}}>
           {userRole === 'teacher' && (
             <TouchableOpacity style={[styles.quickAction, {backgroundColor: theme.primary}]} onPress={()=>navigation.navigate('CreateCourse', { userName })}>
                <View style={[styles.iconCircle, {backgroundColor: 'rgba(255,255,255,0.2)'}]}><Ionicons name="add" size={24} color="white"/></View>
                <Text style={styles.quickActionTextLight}>New Course</Text>
             </TouchableOpacity>
           )}
           <TouchableOpacity style={[styles.quickAction, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginLeft: userRole === 'teacher' ? 12 : 0}]} onPress={()=>navigation.navigate('Grades')}>
              <View style={[styles.iconCircle, {backgroundColor: theme.bg}]}><Ionicons name="ribbon" size={24} color={theme.accent}/></View>
              <Text style={[styles.quickActionText, {color: theme.text}]}>My Grades</Text>
           </TouchableOpacity>
        </View>

        <Text style={{fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16}}>Active Courses</Text>
        
        {displayCourses.length === 0 ? (
          <View style={{alignItems:'center', marginTop: 40, opacity: 0.5}}>
             <Ionicons name="library-outline" size={60} color={theme.sub} />
             <Text style={{marginTop: 10, color: theme.sub}}>No courses found.</Text>
          </View>
        ) : (
          displayCourses.map(item => (
            <Card key={item.id} theme={theme} style={{marginBottom: 16, padding: 0}} onPress={() => navigation.navigate('Details', { courseId: item.id, userRole, userId })}>
              <View style={{padding: 16, flexDirection: 'row', alignItems: 'center'}}>
                 <View style={{width: 50, height: 50, borderRadius: 12, backgroundColor: theme.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
                    <Text style={{fontSize: 24}}>🎓</Text>
                 </View>
                 <View style={{flex: 1}}>
                    <Text style={{fontSize: 16, fontWeight: '700', color: theme.text}}>{item.title}</Text>
                    <Text style={{fontSize: 13, color: theme.sub, marginTop: 2}}>by {item.instructor_name}</Text>
                 </View>
                 {item.isEnrolled ? (
                   <View style={{backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20}}>
                      <Text style={{color: '#059669', fontSize: 10, fontWeight: 'bold'}}>ENROLLED</Text>
                   </View>
                 ) : (
                   <Ionicons name="chevron-forward" size={20} color={theme.sub} />
                 )}
              </View>
              <View style={{flexDirection: 'row', padding: 16, paddingTop: 0, alignItems: 'center'}}>
                 <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 16}}>
                    <Ionicons name="document-text-outline" size={14} color={theme.sub} />
                    <Text style={{fontSize: 12, color: theme.sub, marginLeft: 4}}>{item.lessons?.length || 0} Lessons</Text>
                 </View>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="code-slash-outline" size={14} color={theme.sub} />
                    <Text style={{fontSize: 12, color: theme.sub, marginLeft: 4}}>{item.projects?.length || 0} Assignments</Text>
                 </View>
              </View>
              {item.isEnrolled && (
                 <View style={{height: 4, backgroundColor: theme.bg, width: '100%'}}>
                    <View style={{height: '100%', width: `${item.progress}%`, backgroundColor: theme.success}} />
                 </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- SCREEN 2: COURSE DETAILS ---
function DetailsScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { courseId, userId, userRole } = route.params;
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('lessons');

  // Edit Project State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');

  const fetchCourseDetails = useCallback(() => {
    axios.get(`${API_URL}/courses/${courseId}/`).then(res => {
        setCourse(res.data);
        setLoading(false);
        if(userRole === 'student') {
           axios.get(`${API_URL}/enrollments/`).then(eRes => {
               setEnrolled(eRes.data.some(e => e.student === userId && e.course === courseId));
           });
        }
    }).catch(() => setLoading(false));
  }, [courseId]);

  useFocusEffect(useCallback(() => { fetchCourseDetails(); }, [fetchCourseDetails]));

  const joinClass = () => {
      axios.post(`${API_URL}/enrollments/`, {student: userId, course: courseId})
           .then(() => { setEnrolled(true); setAlert({visible:true, title:"Success", message:"You have joined!", type:"success"}); })
           .catch(() => {});
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setNewDeadline(project.deadline || '');
    setEditModalVisible(true);
  };

  const saveProjectUpdate = () => {
    if (!editingProject) return;
    axios.patch(`${API_URL}/projects/${editingProject.id}/`, { deadline: newDeadline })
    .then(() => { setEditModalVisible(false); fetchCourseDetails(); });
  };

  const deleteContent = (id, type) => {
    Alert.alert("Delete", `Are you sure you want to delete this ${type}?`, [
        { text: "Cancel" },
        { text: "Delete", style: 'destructive', onPress: () => {
            let endpoint = type === 'lesson' ? 'lessons' : type === 'project' ? 'projects' : 'announcements';
            axios.delete(`${API_URL}/${endpoint}/${id}/`)
                .then(() => fetchCourseDetails())
                .catch(() => Alert.alert("Error", "Could not delete."));
        }}
    ]);
  };

  const handleLinkOpen = (url) => {
      if (url) Linking.openURL(url).catch(err => Alert.alert("Error", "Could not open link."));
  };

  const handleFileOpen = (fileUrl) => {
      if (fileUrl) {
          const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
          Linking.openURL(fullUrl).catch(err => Alert.alert("Error", "Could not open file."));
      }
  };

  const [alert, setAlert] = useState({visible: false, title:'', message:'', type:''});

  if(!course) return <View style={{flex:1, backgroundColor:theme.bg, justifyContent:'center'}}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <View style={{flex:1, backgroundColor: theme.bg}}>
       <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} theme={theme} onClose={()=>setAlert({...alert, visible:false})} />
       
       <Header 
         title={course.title} 
         subtitle={course.instructor_name} 
         onBack={() => navigation.goBack()} 
         theme={theme}
         rightAction={userRole === 'student' && !enrolled ? (
            <TouchableOpacity onPress={joinClass} style={{backgroundColor: theme.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}>
               <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Join Class</Text>
            </TouchableOpacity>
         ) : userRole === 'student' && enrolled ? (
            <View style={{backgroundColor: theme.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border}}>
               <Text style={{color: theme.success, fontWeight: 'bold', fontSize: 10}}>ENROLLED</Text>
            </View>
         ) : null}
       />

       <View style={{padding: 20, paddingBottom: 0}}>
          <Text style={{color: theme.sub, lineHeight: 22}}>{course.description}</Text>
          
          {/* TEACHER ACTIONS - EXCLUSIVE TO TEACHERS */}
          {userRole === 'teacher' && (
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 16}}>
                <TouchableOpacity style={[styles.chip, {backgroundColor: theme.primary}]} onPress={()=>navigation.navigate('AddContent', {courseId: course.id, type:'lesson'})}>
                   <Ionicons name="add" size={16} color="white" />
                   <Text style={[styles.chipText, {color:'white'}]}>Lesson</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, {backgroundColor: theme.accent}]} onPress={()=>navigation.navigate('AddContent', {courseId: course.id, type:'project'})}>
                   <Ionicons name="add" size={16} color="white" />
                   <Text style={[styles.chipText, {color:'white'}]}>Assignment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, {backgroundColor: theme.text}]} onPress={()=>navigation.navigate('AddContent', {courseId: course.id, type:'announcement'})}>
                   <Ionicons name="megaphone" size={16} color="white" />
                   <Text style={[styles.chipText, {color:'white'}]}>Announce</Text>
                </TouchableOpacity>
             </ScrollView>
          )}

          {/* TABS */}
          <View style={{flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: theme.border}}>
             {['lessons', 'assignments', 'announcements'].map(tab => (
                <TouchableOpacity key={tab} onPress={()=>setActiveTab(tab)} style={{marginRight: 24, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: activeTab === tab ? theme.primary : 'transparent'}}>
                   <Text style={{color: activeTab === tab ? theme.primary : theme.sub, fontWeight: 'bold', textTransform: 'capitalize'}}>{tab}</Text>
                </TouchableOpacity>
             ))}
          </View>
       </View>

       <ScrollView contentContainerStyle={{padding: 20}}>
          {activeTab === 'lessons' && (
             <>
                {course.lessons?.length === 0 && <Text style={{textAlign:'center', color: theme.sub, marginTop: 40}}>No lessons yet.</Text>}
                {course.lessons?.map((l, index) => (
                   <Card key={l.id} theme={theme} style={{marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center'}} onPress={() => { setSelectedLesson(l); setModalVisible(true); }}>
                      <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
                         <Text style={{fontWeight: 'bold', color: theme.sub}}>{index + 1}</Text>
                      </View>
                      <Text style={{flex: 1, fontWeight: '600', color: theme.text}}>{l.title}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {userRole === 'teacher' && (
                            <TouchableOpacity onPress={() => deleteContent(l.id, 'lesson')} style={{marginRight: 10}}>
                                <Ionicons name="trash-outline" size={20} color={theme.error} />
                            </TouchableOpacity>
                        )}
                        <Ionicons name="play-circle" size={24} color={theme.primary} />
                      </View>
                   </Card>
                ))}
             </>
          )}

          {activeTab === 'assignments' && (
             <>
               {course.projects?.length === 0 && <Text style={{textAlign:'center', color: theme.sub, marginTop: 40}}>No assignments yet.</Text>}
               {course.projects?.map(p => (
                  <Card key={p.id} theme={theme} style={{marginBottom: 12, padding: 16}}>
                     <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
                        <Text style={{fontSize: 16, fontWeight: 'bold', color: theme.text}}>{p.title}</Text>
                        <Text style={{fontSize: 12, color: theme.error, fontWeight:'bold'}}>Due: {p.deadline}</Text>
                     </View>
                     <Text style={{color: theme.sub, fontSize: 14}} numberOfLines={2}>{p.instructions}</Text>
                     <View style={{flexDirection:'row', marginTop: 12, justifyContent: 'flex-end', alignItems: 'center'}}>
                        {/* Only show Submit Work to students */}
                        {userRole === 'student' && (
                            <TouchableOpacity style={[styles.btnOutline, {borderColor: theme.primary, marginRight: 8}]} onPress={()=>navigation.navigate('Submit', {project: p})}>
                               <Text style={{color: theme.primary, fontSize: 12, fontWeight: 'bold'}}>Submit Work</Text>
                            </TouchableOpacity>
                        )}
                        {userRole === 'teacher' && (
                           <>
                              <TouchableOpacity style={[styles.btnOutline, {borderColor: theme.accent, marginRight: 8}]} onPress={()=>navigation.navigate('Grading', {projectId: p.id, projectTitle: p.title})}>
                                 <Text style={{color: theme.accent, fontSize: 12, fontWeight: 'bold'}}>Grade</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{padding: 8}} onPress={()=>handleEditProject(p)}>
                                 <Ionicons name="create-outline" size={18} color={theme.sub} />
                              </TouchableOpacity>
                              <TouchableOpacity style={{padding: 8}} onPress={()=>deleteContent(p.id, 'project')}>
                                 <Ionicons name="trash-outline" size={18} color={theme.error} />
                              </TouchableOpacity>
                           </>
                        )}
                     </View>
                  </Card>
               ))}
             </>
          )}

          {activeTab === 'announcements' && (
             <>
                {course.announcements?.length === 0 && <Text style={{textAlign:'center', color: theme.sub, marginTop: 40}}>No announcements.</Text>}
                {course.announcements?.map(ann => (
                   <View key={ann.id} style={{backgroundColor: theme.primaryLight, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <View style={{flex: 1}}>
                        <Text style={{fontWeight: 'bold', color: theme.primary, marginBottom: 4}}>{ann.title}</Text>
                        <Text style={{color: theme.text}}>{ann.content}</Text>
                      </View>
                      {userRole === 'teacher' && (
                        <TouchableOpacity onPress={()=>deleteContent(ann.id, 'announcement')}>
                            <Ionicons name="trash-outline" size={18} color={theme.error} />
                        </TouchableOpacity>
                      )}
                   </View>
                ))}
             </>
          )}
       </ScrollView>

       {/* Lesson Modal */}
       <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={{flex:1, backgroundColor: theme.bg}}>
             <View style={{padding: 20, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomWidth: 1, borderColor: theme.border}}>
                <Text style={{fontSize: 18, fontWeight:'bold', color: theme.text}}>Lesson Content</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
             </View>
             <ScrollView contentContainerStyle={{padding: 24}}>
                <Text style={{fontSize: 24, fontWeight: '800', color: theme.primary, marginBottom: 16}}>{selectedLesson?.title}</Text>
                <Text style={{fontSize: 16, lineHeight: 28, color: theme.text}}>{selectedLesson?.content_text}</Text>
                {selectedLesson?.video_url && (
                   <View style={{marginTop: 32, padding: 20, backgroundColor: theme.card, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border}}>
                      <Ionicons name="videocam" size={40} color={theme.accent} />
                      <Text style={{color: theme.text, marginTop: 8, fontWeight: 'bold'}}>Video Resource Available</Text>
                      <TouchableOpacity onPress={() => handleLinkOpen(selectedLesson.video_url)}>
                          <Text style={{color: theme.primary, marginTop: 4, textDecorationLine:'underline'}}>{selectedLesson.video_url}</Text>
                      </TouchableOpacity>
                   </View>
                )}
           {selectedLesson?.attachments?.length > 0 && (
             <View style={{marginTop: 20}}>
              <Text style={{color: theme.sub, fontWeight: '700', marginBottom: 8}}>Attachments</Text>
              {selectedLesson.attachments.map(att => (
                <TouchableOpacity key={att.id} style={{flexDirection:'row', alignItems:'center', padding: 12, backgroundColor: theme.card, borderRadius: 10, borderWidth:1, borderColor: theme.border, marginBottom:8}} onPress={() => handleFileOpen(att.file)}>
                  <Ionicons name="document-attach" size={20} color={theme.accent} />
                  <View style={{marginLeft: 10}}>
                    <Text style={{color: theme.text, fontWeight:'600'}} numberOfLines={1}>{att.display_name || att.file.split('/').pop()}</Text>
                    <Text style={{color: theme.sub, fontSize:12}}>{new Date(att.uploaded_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
             </View>
           )}
             </ScrollView>
          </View>
       </Modal>

       {/* Edit Project Modal */}
       <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
           <View style={[styles.alertBox, {backgroundColor: theme.card}]}>
              <Text style={[styles.alertTitle, {color: theme.text}]}>Update Deadline</Text>
              <TextInput 
                 style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, width:'100%', textAlign:'center'}]} 
                 value={newDeadline} onChangeText={setNewDeadline} placeholder="YYYY-MM-DD" placeholderTextColor={theme.sub}
              />
              <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16}}>
                 <TouchableOpacity style={[styles.btnOutline, {flex: 1, marginRight: 8, borderColor: theme.border}]} onPress={() => setEditModalVisible(false)}>
                    <Text style={{color: theme.sub, fontWeight: 'bold'}}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.btnPrimary, {flex: 1, backgroundColor: theme.primary}]} onPress={saveProjectUpdate}>
                    <Text style={styles.btnText}>Save</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </View>
  );
}

// --- SCREEN: ADD CONTENT ---
function AddContentScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { courseId, type } = route.params;
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({visible:false, title:'', message:'', type:''});
  const [lessonFile, setLessonFile] = useState(null);

  const pickLessonFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets[0];
      setLessonFile(picked);
    } catch (err) {
      setAlert({visible:true, title:'Error', message:'Could not select file.', type:'error'});
    }
  };

  const handleSave = () => {
    if(!data.title && type !== 'announcement') return setAlert({visible:true, title:"Missing Info", message:"Title is required.", type:'error'});
    
    setLoading(true);
    let endpoint = type === 'lesson' ? 'lessons' : type === 'project' ? 'projects' : 'announcements';
    let payload = { ...data, course: courseId };
    
    if(type === 'lesson') payload.order = 1; 
    if(type === 'project') { payload.points = 100; if(!payload.deadline) payload.deadline = '2025-12-31'; }

    axios.post(`${API_URL}/${endpoint}/`, payload)
    .then(async (res) => {
       setLoading(false);
       // If lesson and file picked, upload attachment
       try {
         if (type === 'lesson' && lessonFile && res.data && res.data.id) {
           const form = new FormData();
           form.append('lesson', res.data.id);
           if (Platform.OS === 'web') {
             const r = await fetch(lessonFile.uri);
             const blob = await r.blob();
             form.append('file', blob, lessonFile.name);
           } else {
             form.append('file', {
               uri: lessonFile.uri,
               name: lessonFile.name,
               type: lessonFile.mimeType || 'application/octet-stream',
             });
           }
           // optional display name
           if (lessonFile.name) form.append('display_name', lessonFile.name);
           await axios.post(`${API_URL}/lesson-attachments/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
         }
       } catch (err) {
         console.warn('Attachment upload failed', err);
       }

       setAlert({visible:true, title:"Success", message:"Added successfully.", type:"success", onSuccess:()=>navigation.goBack()});
    })
    .catch((err) => { 
        setLoading(false);
        setAlert({visible:true, title:"Error", message:"Could not save content. Check inputs.", type:"error"});
    });
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} theme={theme} onClose={()=>{setAlert({...alert, visible:false}); if(alert.onSuccess) alert.onSuccess();}} />
       <Header title={`Add ${type}`} onBack={() => navigation.goBack()} theme={theme} />
       <ScrollView contentContainerStyle={{padding: 24}}>
          <Card theme={theme} style={{padding: 20}}>
             {type !== 'announcement' && (
               <>
                 <Text style={styles.label}>TITLE</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} onChangeText={t => setData({...data, title: t})} />
               </>
             )}
             
             {type === 'announcement' && (
               <>
                 <Text style={styles.label}>TITLE (Optional)</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} onChangeText={t => setData({...data, title: t})} />
               </>
             )}
             
             {type === 'lesson' && (
               <>
                 <Text style={styles.label}>CONTENT</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 120}]} multiline onChangeText={t => setData({...data, content_text: t})} />
                 <Text style={styles.label}>VIDEO URL (OPTIONAL)</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} onChangeText={t => setData({...data, video_url: t})} />
                 
                  <Text style={[styles.label, {marginTop: 12}]}>ATTACH FILE (OPTIONAL)</Text>
                  <TouchableOpacity style={[styles.uploadBox, {borderColor: theme.primary, backgroundColor: theme.bg}]} onPress={pickLessonFile}>
                     <Ionicons name={lessonFile ? "document-text" : "cloud-upload-outline"} size={36} color={theme.primary} />
                     <Text style={{color: theme.text, fontWeight: 'bold', marginTop: 8}}>{lessonFile ? lessonFile.name : 'Attach a file (PDF, PPT, ZIP)'}</Text>
                     <Text style={{color: theme.sub, fontSize: 12, marginTop: 4}}>{lessonFile ? `${(lessonFile.size / 1024).toFixed(2)} KB` : 'Optional'} </Text>
                  </TouchableOpacity>
               </>
             )}
             {type === 'project' && (
               <>
                 <Text style={styles.label}>INSTRUCTIONS</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 120}]} multiline onChangeText={t => setData({...data, instructions: t})} />
                 <Text style={styles.label}>DUE DATE (YYYY-MM-DD)</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} placeholder="2025-12-31" onChangeText={t => setData({...data, deadline: t})} />
               </>
             )}
             {type === 'announcement' && (
               <>
                 <Text style={styles.label}>MESSAGE</Text>
                 <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 120}]} multiline onChangeText={t => setData({...data, content: t})} />
               </>
             )}

             <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary, marginTop: 24}]} onPress={handleSave}>
                {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Post Now</Text>}
             </TouchableOpacity>
          </Card>
       </ScrollView>
    </SafeAreaView>
  );
}

// --- SCREEN: CREATE COURSE ---
function CreateCourseScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { userName } = route.params || {};
  const [data, setData] = useState({ title: '', description: '', instructor_name: userName || '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({visible:false, title:'', message:'', type:''});

  const handleSave = () => {
    if(!data.title) return setAlert({visible:true, title:"Missing Info", message:"Course Title is required."});
    setLoading(true);
    axios.post(`${API_URL}/courses/`, data).then(() => {
       setLoading(false);
       setAlert({visible:true, title:"Success", message:"Course Created!", type:"success", onSuccess:()=>navigation.goBack()});
    }).catch(() => {
       setLoading(false);
       setAlert({visible:true, title:"Error", message:"Could not create course."});
    });
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} theme={theme} onClose={()=>{setAlert({...alert, visible:false}); if(alert.onSuccess) alert.onSuccess();}} />
       <Header title="New Course" onBack={() => navigation.goBack()} theme={theme} />
       <View style={{padding: 24}}>
          <Card theme={theme} style={{padding: 20}}>
             <Text style={styles.label}>COURSE TITLE</Text>
             <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} onChangeText={t => setData({...data, title: t})} />
             <Text style={styles.label}>DESCRIPTION</Text>
             <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 100}]} multiline onChangeText={t => setData({...data, description: t})} />
             <Text style={styles.label}>INSTRUCTOR NAME</Text>
             <TextInput 
                style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} 
                value={data.instructor_name}
                onChangeText={t => setData({...data, instructor_name: t})} 
             />
             <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary, marginTop: 24}]} onPress={handleSave}>
                {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Create Course</Text>}
             </TouchableOpacity>
          </Card>
       </View>
    </SafeAreaView>
  );
}

// --- SCREEN: SUBMIT ---
function SubmitScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { project } = route.params;
  const [data, setData] = useState({});
  const [file, setFile] = useState(null); // 📂 Store selected file
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({visible:false, title:'', message:'', type:''});

  // 📂 Pick File Function
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', 
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets[0];
      setFile(picked); // Save file info
    } catch (err) {
      setAlert({visible:true, title:"Error", message:"Could not select file.", type:'error'});
    }
  };

  const submit = async () => {
     if (!data.student_name || (!data.github_link && !file)) {
         setAlert({visible:true, title:"Missing Info", message:"Name and Work (File or Link) are required.", type:'error'});
         return;
     }
     
     // Validate URL if provided
     if (data.github_link && !/^(http|https):\/\/[^ "]+$/.test(data.github_link)) {
         setAlert({visible:true, title:"Invalid Link", message:"URL must start with http:// or https://", type:'error'});
         return;
     }

     setLoading(true);
     
     // 📦 FormData for File Upload
     const formData = new FormData();
     formData.append('project', project.id);
     formData.append('student_name', data.student_name);
     if (data.comments) formData.append('comments', data.comments);
     if (data.github_link) formData.append('github_link', data.github_link);
     
     if (file) {
       // Web needs Blob, Mobile needs URI/Type
       if(Platform.OS === 'web') {
           const res = await fetch(file.uri);
           const blob = await res.blob();
           formData.append('submitted_file', blob, file.name);
       } else {
           formData.append('submitted_file', {
             uri: file.uri,
             name: file.name,
             type: file.mimeType || 'application/octet-stream',
           });
       }
     }

     try {
       await axios.post(`${API_URL}/submissions/`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' },
       });
       setLoading(false);
       setAlert({visible:true, title:"Success", message:"Work Submitted!", type:"success", onSuccess: ()=>navigation.goBack()});
     } catch (err) {
       setLoading(false);
       console.error(err);
       setAlert({visible:true, title:"Error", message:"Upload failed.", type:'error'});
     }
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} theme={theme} onClose={()=>{setAlert({...alert, visible:false}); if(alert.onSuccess) alert.onSuccess();}} />
       <Header title="Submit Assignment" onBack={()=>navigation.goBack()} theme={theme} />
       <ScrollView contentContainerStyle={{padding: 24}}>
          <Text style={{fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8}}>{project.title}</Text>
          <Text style={{color: theme.sub, marginBottom: 24}}>Upload your work (PDF, Zip, Docx) or Link.</Text>
          
          <Card theme={theme} style={{padding: 20}}>
             <Text style={styles.label}>YOUR NAME</Text>
             <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} onChangeText={t => setData({...data, student_name: t})} />
             
             <Text style={styles.label}>OPTION 1: UPLOAD FILE</Text>
             <TouchableOpacity 
               style={[styles.uploadBox, {borderColor: theme.primary, backgroundColor: theme.bg}]} 
               onPress={pickFile}
             >
                <Ionicons name={file ? "document-text" : "cloud-upload-outline"} size={40} color={theme.primary} />
                <Text style={{color: theme.text, fontWeight: 'bold', marginTop: 10}}>
                  {file ? file.name : "Click to Select File"}
                </Text>
                <Text style={{color: theme.sub, fontSize: 12, marginTop: 4}}>
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : "Supports PDF, DOCX, ZIP"}
                </Text>
             </TouchableOpacity>

             <Text style={[styles.label, {marginTop:15}]}>OPTION 2: GITHUB / LINK</Text>
             <TextInput 
                style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border}]} 
                placeholder="https://..." 
                placeholderTextColor={theme.sub} 
                onChangeText={t => setData({...data, github_link: t})} 
                autoCapitalize="none"
                keyboardType="url"
             />

             <Text style={[styles.label, {marginTop:15}]}>COMMENTS</Text>
             <TextInput style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 80}]} multiline onChangeText={t => setData({...data, comments: t})} />

             <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary, marginTop: 24}]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Submit Assignment</Text>}
             </TouchableOpacity>
          </Card>
       </ScrollView>
    </SafeAreaView>
  );
}

// --- SCREEN: GRADING (TEACHER) ---
function GradingScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { projectId, projectTitle } = route.params;
  const [subs, setSubs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [grade, setGrade] = useState('');
  
  useFocusEffect(useCallback(() => {
     fetchSubmissions();
  }, [projectId]));

  const fetchSubmissions = () => {
      axios.get(`${API_URL}/submissions/`).then(res => setSubs(res.data.filter(s => s.project === projectId)));
  };

  const handleLinkOpen = (url) => {
      if (url) Linking.openURL(url).catch(() => Alert.alert("Error", "Link invalid."));
  };

  const handleFileOpen = (fileUrl) => {
      if (fileUrl) {
          const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
          Linking.openURL(fullUrl).catch(() => Alert.alert("Error", "File invalid."));
      }
  };

  const openGradeModal = (item) => {
      setSelectedSub(item);
      setGrade(item.grade ? item.grade.toString() : '');
      setModalVisible(true);
  };

  const saveGrade = () => {
      if(!selectedSub) return;
      axios.patch(`${API_URL}/submissions/${selectedSub.id}/`, {grade: parseInt(grade)})
           .then(() => { setModalVisible(false); fetchSubmissions(); })
           .catch(() => Alert.alert("Error", "Could not save grade."));
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <Header title="Grading" subtitle={projectTitle} onBack={()=>navigation.goBack()} theme={theme} />
       <FlatList
         data={subs}
         keyExtractor={i=>i.id.toString()}
         contentContainerStyle={{padding: 20}}
         renderItem={({item}) => (
            <Card theme={theme} style={{marginBottom: 12, padding: 16}}>
               <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
                  <Text style={{fontWeight:'bold', color: theme.text, fontSize: 16}}>{item.student_name}</Text>
                  <Text style={{color: theme.sub, fontSize: 12}}>{new Date(item.submitted_at).toLocaleDateString()}</Text>
               </View>
               
               {/* Clickable Links/Files */}
               <View style={{marginBottom: 12}}>
                   {item.github_link ? (
                       <TouchableOpacity onPress={() => handleLinkOpen(item.github_link)}>
                           <Text style={{color: theme.primary, textDecorationLine:'underline'}}>{item.github_link}</Text>
                       </TouchableOpacity>
                   ) : null}
                   {item.submitted_file ? (
                       <TouchableOpacity onPress={() => handleFileOpen(item.submitted_file)} style={{marginTop: 5, flexDirection:'row', alignItems:'center'}}>
                           <Ionicons name="document-attach" size={16} color={theme.accent}/>
                           <Text style={{color: theme.primary, marginLeft: 5, textDecorationLine:'underline'}}>View Submitted File</Text>
                       </TouchableOpacity>
                   ) : null}
               </View>

               <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth: 1, borderColor: theme.border, paddingTop: 12}}>
                  <Text style={{color: theme.sub}}>Grade: <Text style={{fontWeight:'bold', color: item.grade ? theme.success : theme.accent}}>{item.grade ? item.grade : 'Pending'}</Text></Text>
                  <TouchableOpacity style={[styles.btnOutline, {borderColor: theme.accent, paddingVertical: 6}]} onPress={() => openGradeModal(item)}>
                      <Text style={{color: theme.accent, fontSize: 12, fontWeight: 'bold'}}>Grade Now</Text>
                  </TouchableOpacity>
               </View>
            </Card>
         )}
         ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color: theme.sub}}>No submissions yet.</Text>}
       />

       {/* GRADE MODAL */}
       <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.alertOverlay}>
           <View style={[styles.alertBox, {backgroundColor: theme.card}]}>
              <Text style={[styles.alertTitle, {color: theme.text}]}>Grade {selectedSub?.student_name}</Text>
              <TextInput 
                 style={[styles.input, {backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, width:'100%', textAlign:'center'}]} 
                 value={grade} onChangeText={setGrade} placeholder="0 - 100" keyboardType="numeric" placeholderTextColor={theme.sub}
              />
              <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16}}>
                 <TouchableOpacity style={[styles.btnOutline, {flex: 1, marginRight: 8, borderColor: theme.border}]} onPress={() => setModalVisible(false)}><Text style={{color: theme.sub, fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                 <TouchableOpacity style={[styles.btnPrimary, {flex: 1, backgroundColor: theme.primary}]} onPress={saveGrade}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- SCREEN: GRADES (STUDENT) ---
function GradesScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]); // New state
  
  useFocusEffect(useCallback(() => {
     // Fetch both
     axios.get(`${API_URL}/submissions/`).then(res => setGrades(res.data));
     axios.get(`${API_URL}/courses/`).then(res => setCourses(res.data));
  }, []));

  // Helper to find details
  const getContext = (projectId) => {
      for (const c of courses) {
          const p = c.projects?.find(proj => proj.id === projectId);
          if (p) return { course: c.title, instructor: c.instructor_name, assignment: p.title };
      }
      return { course: 'Loading...', instructor: '', assignment: 'Assignment' };
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <Header title="My Grades" onBack={()=>navigation.goBack()} theme={theme} />
       <FlatList 
         data={grades} 
         contentContainerStyle={{padding: 20}}
         renderItem={({item}) => {
            const { course, instructor, assignment } = getContext(item.project);
            return (
                <Card theme={theme} style={{marginBottom: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: item.grade ? theme.success : theme.border}}>
                   {/* Assignment Title */}
                   <Text style={{fontWeight:'bold', color: theme.text, fontSize: 16, marginBottom: 4}}>{assignment}</Text>
                   
                   {/* Course & Instructor */}
                   <Text style={{color: theme.sub, fontSize: 13, marginBottom: 12}}>
                      {course} • <Text style={{fontWeight:'500'}}>{instructor}</Text>
                   </Text>

                   <View style={{height:1, backgroundColor: theme.border, marginBottom: 12}}/>

                   <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                      <View>
                        <Text style={{fontSize: 12, color: theme.sub}}>Student</Text>
                        <Text style={{fontWeight:'600', color: theme.text}}>{item.student_name}</Text>
                      </View>
                      <View style={{alignItems:'flex-end'}}>
                        <Text style={{fontSize: 12, color: theme.sub}}>Score</Text>
                        <Text style={{fontWeight:'bold', color: item.grade ? theme.success : theme.accent, fontSize: 18}}>
                           {item.grade ? item.grade : 'Pending'}
                        </Text>
                      </View>
                   </View>
                </Card>
            );
         }} 
       />
    </SafeAreaView>
  );
}

// --- SCREEN: QUIZ ---
function QuizScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { quizData } = route.params;
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if(!quizData.questions.length) return <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: theme.bg}}><Text style={{color: theme.text}}>No questions.</Text></View>;

  const handleAnswer = (choice) => {
     if(choice.is_correct) setScore(score + 1);
     if(qIndex < quizData.questions.length - 1) setQIndex(qIndex + 1); else setFinished(true);
  }

  if(finished) return (
     <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: theme.bg}}>
        <View style={{backgroundColor: theme.card, padding: 40, borderRadius: 20, alignItems: 'center', shadowColor: theme.shadow.shadowColor, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5}}>
           <Ionicons name="trophy" size={80} color={theme.accent} />
           <Text style={{fontSize: 24, fontWeight: 'bold', marginVertical: 20, color: theme.text}}>Quiz Complete!</Text>
           <Text style={{fontSize: 40, fontWeight: '800', color: theme.primary}}>{Math.round((score / quizData.questions.length) * 100)}%</Text>
           <Text style={{color: theme.sub, marginBottom: 30}}>{score} out of {quizData.questions.length} correct</Text>
           <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: theme.primary, width: 200}]} onPress={() => navigation.goBack()}>
              <Text style={styles.btnText}>Finish</Text>
           </TouchableOpacity>
        </View>
     </View>
  );

  const question = quizData.questions[qIndex];

  return (
     <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
        <Header title={quizData.title} subtitle={`Question ${qIndex+1} / ${quizData.questions.length}`} onBack={()=>navigation.goBack()} theme={theme} />
        <View style={{padding: 24}}>
           <Text style={{fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 32, lineHeight: 32}}>{question.text}</Text>
           {question.choices.map(c => (
              <TouchableOpacity key={c.id} style={{backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 12, flexDirection:'row', alignItems:'center'}} onPress={() => handleAnswer(c)}>
                 <View style={{width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, marginRight: 16}} />
                 <Text style={{fontSize: 16, color: theme.text, fontWeight: '500'}}>{c.text}</Text>
              </TouchableOpacity>
           ))}
        </View>
     </SafeAreaView>
  );
}

// --- SCREEN: NOTIFICATIONS ---
function NotificationsScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const [notifs, setNotifs] = useState([]);

  useFocusEffect(useCallback(() => {
    axios.get(`${API_URL}/notifications/`).then(res => setNotifs(res.data)).catch(() => {});
  }, []));

  return (
    <SafeAreaView style={{flex:1, backgroundColor: theme.bg}}>
       <Header title="Notifications" onBack={()=>navigation.goBack()} theme={theme} />
       <FlatList
         data={notifs}
         keyExtractor={i=>i.id.toString()}
         contentContainerStyle={{padding:20}}
      renderItem={({item}) => (
        <TouchableOpacity onPress={() => {
           axios.post(`${API_URL}/notifications/${item.id}/mark_read/`).then(() => {
              setNotifs(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
           }).catch(() => {});
        }}>
        <Card theme={theme} style={{marginBottom: 12, padding: 16, opacity: item.is_read ? 0.6 : 1}}>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <Text style={{fontWeight:'bold', color: theme.text}}>{item.title}</Text>
            <Text style={{fontSize:12, color: theme.sub}}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={{color: theme.sub, marginTop: 5}}>{item.message}</Text>
        </Card>
        </TouchableOpacity>
      )}
         ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color: theme.sub}}>No notifications.</Text>}
       />
    </SafeAreaView>
  );
}

// --- MAIN WRAPPER & THEME PROVIDER ---
export default function App() {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark(!isDark);

  // Auth state
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // Load token from storage on start
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        if (token) {
          setAuthToken(token);
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
        }
        if (userStr) setAuthUser(JSON.parse(userStr));
        // register push token (best-effort)
        if (token) await registerPushToken(token);
      } catch (e) {
        console.log('Auth load error', e);
      }
    })();
  }, []);

  const logout = async (navigation) => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setAuthToken(null);
      setAuthUser(null);
      if (navigation) navigation.replace('Login');
    } catch (e) { console.log('Logout error', e); }
  };

  // Register device push token with backend (Expo)
  const registerPushToken = async (token) => {
    try {
      // Ask for permissions and get expo push token
      if (!Constants.isDevice) return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = pushTokenData.data;
      // send to backend
      if (pushToken) {
        await axios.post(`${API_URL}/devices/`, { device_type: 'expo', token: pushToken });
      }
    } catch (e) {
      console.log('Push register error', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, authToken, authUser, setAuthToken, setAuthUser, registerPushToken, logout }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen name="Submit" component={SubmitScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
          <Stack.Screen name="AddContent" component={AddContentScreen} />
          <Stack.Screen name="Grades" component={GradesScreen} />
          <Stack.Screen name="Grading" component={GradingScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { padding: 24, borderRadius: 24, width: '85%', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  alertIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  alertMessage: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertBtn: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 14, width: '100%', alignItems: 'center' },
  alertBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  headerContainer: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? 40 : 16 },
  headerBackBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  
  input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, letterSpacing: 0.5 },
  
  btnPrimary: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  quickAction: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickActionText: { fontWeight: '700', fontSize: 14 },
  quickActionTextLight: { fontWeight: '700', fontSize: 14, color: 'white' },
  
  sectionHeader: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipText: { fontWeight: '700', fontSize: 13, marginLeft: 6 },

  uploadBox: {
    height: 150,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5
  }
});