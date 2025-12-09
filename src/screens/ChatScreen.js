import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { CHAT_URL } from '../config/api';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const webViewRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Force hide loading after 5 seconds as fallback
  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout: Force hiding loading overlay');
      setIsLoading(false);
    }, 5000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Intercept React Navigation back action (header back button)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default back behavior
      e.preventDefault();
      
      console.log('🔙 Navigation back intercepted');
      console.log('  Can go back in WebView:', canGoBack);
      console.log('  Current URL:', currentUrl);
      
      // If on login page or can't go back, allow exit
      if (currentUrl.includes('/login') || 
          currentUrl === CHAT_URL || 
          currentUrl === CHAT_URL + '/' ||
          !canGoBack) {
        console.log('📱 Allowing exit to Signup');
        navigation.dispatch(e.data.action);
        return;
      }
      
      // Otherwise, go back in WebView
      if (webViewRef.current && canGoBack) {
        console.log('⬅️ Going back in WebView (header button)');
        webViewRef.current.goBack();
      }
    });

    return unsubscribe;
  }, [navigation, canGoBack, currentUrl]);

  // Handle Android hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        console.log('🔙 Hardware back pressed');
        console.log('  Can go back:', canGoBack);
        console.log('  Current URL:', currentUrl);
        
        // If on login page or home page, exit to signup screen
        if (currentUrl.includes('/login') || 
            currentUrl === CHAT_URL || 
            currentUrl === CHAT_URL + '/' ||
            !canGoBack) {
          console.log('📱 Exiting to signup screen');
          navigation.goBack();
          return true;
        }
        
        // Otherwise navigate back in WebView
        if (webViewRef.current && canGoBack) {
          console.log('⬅️ Going back in WebView (hardware button)');
          webViewRef.current.goBack();
          return true;
        }
        
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation, canGoBack, currentUrl])
  );

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView error:', nativeEvent);
    setError('Unable to load chat. Please check your internet connection.');
    setIsLoading(false);
  };

  const reload = () => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#00D4AA' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryButtonText, { color: '#00D4AA' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: CHAT_URL }}
        style={styles.webview}
        
        // Loading events
        onLoadStart={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('🔄 LOAD START:', nativeEvent.url);
          if (!nativeEvent.url.includes('/home') && !nativeEvent.url.includes('/direct') && !nativeEvent.url.includes('/channel')) {
            setIsLoading(true);
          }
        }}
        
        onLoadProgress={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const progress = Math.round(nativeEvent.progress * 100);
          if (progress === 100) {
            setTimeout(() => setIsLoading(false), 500);
          }
        }}
        
        onLoadEnd={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('✅ LOAD END:', nativeEvent.url);
          setTimeout(() => setIsLoading(false), 300);
        }}
        
        onLoad={(syntheticEvent) => {
          console.log('✅ LOADED');
          setIsLoading(false);
        }}
        
        // Navigation state tracking
        onNavigationStateChange={(navState) => {
          console.log('📍 NAVIGATION:', navState.url);
          console.log('  Can go back:', navState.canGoBack);
          
          // Update state for back button handling
          setCanGoBack(navState.canGoBack);
          setCurrentUrl(navState.url);
          
          // Hide loading when navigation completes
          if (!navState.loading && navState.title && navState.title !== 'chat.mrbright.ai') {
            setTimeout(() => setIsLoading(false), 200);
          }
        }}
        
        // Error handling
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ ERROR:', nativeEvent);
          Alert.alert('WebView Error', `${nativeEvent.description}\n\nURL: ${nativeEvent.url}`);
          handleError(syntheticEvent);
        }}
        
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ HTTP ERROR:', nativeEvent.statusCode);
          if (nativeEvent.statusCode >= 400) {
            Alert.alert('HTTP Error', `Status: ${nativeEvent.statusCode}`);
          }
        }}
        
        // JavaScript & DOM
        javaScriptEnabled={true}
        domStorageEnabled={true}
        javaScriptCanOpenWindowsAutomatically={true}
        
        // Media
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        
        // Files
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        
        // Cookies & Cache
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        
        // Android specific
        mixedContentMode="always"
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        
        // Origin & Navigation
        originWhitelist={['*']}
        allowsBackForwardNavigationGestures={true}
        
        // User Agent
        userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        
        // Rendering
        scalesPageToFit={true}
        startInLoadingState={false}
        bounces={false}
        overScrollMode="never"
        
        // Performance
        incognito={false}
        setSupportMultipleWindows={false}
        geolocationEnabled={true}
        
        // Inject JavaScript
        injectedJavaScript={`
          window.isNativeApp = true;
          window.isAndroidApp = true;
          
          window.addEventListener('load', function() {
            console.log('✅ WebView page fully loaded');
            setTimeout(function() {
              window.ReactNativeWebView.postMessage('PAGE_LOADED');
            }, 500);
          });
          
          true;
        `}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Loading chat...</Text>
          <Text style={styles.loadingSubtext}>Please wait...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#00D4AA',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
