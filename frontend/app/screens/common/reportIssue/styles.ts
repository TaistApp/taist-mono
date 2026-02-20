import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pageView: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  previewWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
  contextBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  contextText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  vcenter: {
    marginTop: 12,
    marginBottom: 24,
  },
});
