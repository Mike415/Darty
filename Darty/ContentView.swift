import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView()
            #if os(iOS)
            .ignoresSafeArea(.all, edges: .all)
            .edgesIgnoringSafeArea(.all)
            #endif
    }
}

#Preview {
    ContentView()
}
