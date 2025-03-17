// This is a script to help you update auth imports in all files
// Run this command in your terminal to find all files that need updating:
// 
// grep -r "import { auth } from '@/app/(auth)/auth'" app/ > auth-imports.txt
//
// Then look at the resulting auth-imports.txt file to see all files that need to be changed
//
// For each file:
// 1. Change the import line from: 
//    import { auth } from '@/app/(auth)/auth';
//    to:
//    import { getServerSession } from '@/lib/auth-utils';
//
// 2. Change all occurrences of "await auth()" to "await getServerSession()"
//
// Sample command to perform the replacement (on Unix/Linux/Mac):
// find app/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/import { auth } from '\''@\/app\/(auth)\/auth'\'';/import { getServerSession } from '\''@\/lib\/auth-utils'\'';/g'
// find app/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/await auth\(\)/await getServerSession()/g'
//
// For Windows PowerShell:
// Get-ChildItem -Path app/ -Include *.ts,*.tsx -Recurse | ForEach-Object { (Get-Content $_.FullName) -replace "import { auth } from '@/app/\(auth\)/auth';", "import { getServerSession } from '@/lib/auth-utils';" | Set-Content $_.FullName }
// Get-ChildItem -Path app/ -Include *.ts,*.tsx -Recurse | ForEach-Object { (Get-Content $_.FullName) -replace "await auth\(\)", "await getServerSession()" | Set-Content $_.FullName } 