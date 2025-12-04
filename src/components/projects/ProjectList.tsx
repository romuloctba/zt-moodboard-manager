'use client';

import { useRouter } from 'next/navigation';
import type { Project } from '@/types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();

  const handleProjectClick = (project: Project) => {
    router.push(`/projects/view?projectId=${project.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => handleProjectClick(project)}
        />
      ))}
    </div>
  );
}
