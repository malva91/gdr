# Note di Sicurezza PHP

## ⚠️ Problematiche di Sicurezza Rilevate

### upload.php
**Problemi:**
- Nessuna autenticazione: chiunque può caricare file
- Nessuna autorizzazione: non verifica se l'utente ha diritti
- Storage locale: usa filesystem invece di Supabase Storage
- Path traversal: possibile con sanitizzazione base

**Rischi:**
- Upload di file non autorizzati
- Esaurimento spazio disco
- Potenziali exploit via path manipulation

### delete.php
**Problemi:**
- Nessuna autenticazione: chiunque può eliminare file
- Nessuna autorizzazione: non verifica ownership
- Wildcard deletion: permette eliminazione massiva senza conferma
- Storage locale: non sincronizzato con database

**Rischi:**
- Eliminazione file di altri utenti
- Perdita dati
- Denial of Service

## 🔒 Raccomandazioni

### Immediate (Alta Priorità)
1. **Aggiungere autenticazione JWT**: Verificare token Firebase/Auth
2. **Validare ownership**: Controllare che l'utente abbia diritti sul file
3. **Rate limiting**: Limitare numero upload/delete per utente
4. **Log audit**: Tracciare tutte le operazioni

### Strategiche (Media Priorità)
1. **Migrare a Supabase Storage**:
   ```javascript
   // Client-side con Supabase Storage
   const { data, error } = await supabase.storage
     .from('assets')
     .upload(`${room}/${type}/${filename}`, file)
   ```

2. **Implementare Row Level Security (RLS)**:
   ```sql
   CREATE POLICY "Users can upload to own room"
   ON storage.objects FOR INSERT
   TO authenticated
   USING (bucket_id = 'assets' AND auth.uid() = owner);
   ```

3. **Usare Edge Functions** per logica server-side sicura

### Miglioramenti Architetturali
- Spostare gestione file nel database (metadata)
- Usare storage object come source of truth
- Implementare garbage collection automatico
- Aggiungere virus scanning (ClamAV)

## 📋 Checklist Implementazione

- [ ] Autenticazione JWT in entrambi i file PHP
- [ ] Validazione ownership per operazioni
- [ ] Migrazione a Supabase Storage
- [ ] Setup RLS policies
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Test di sicurezza

## 🎯 Prossimi Passi

1. Decidere se mantenere PHP o migrare a Supabase completamente
2. Se PHP: implementare autenticazione Firebase Admin SDK
3. Se Supabase: rimuovere file PHP e usare Storage + Edge Functions
4. Testare con security audit tools (OWASP ZAP, etc.)
