import React, { useState } from 'react';
import { usePublishedFaqs } from '../../hooks/useCmsContent';
import { Accordion } from '../ui/Accordion';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { HelpCircle, Search, ArrowRight } from 'lucide-react';

export interface FaqSectionProps {
  onOpenBooking: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenBooking }) => {
  const publishedFaqs = usePublishedFaqs();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'General', 'Safety', 'Appointments', 'Conditions'];

  const filteredFaqs = publishedFaqs.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const accordionItems = filteredFaqs.map(f => ({
    id: f.id,
    title: f.question,
    badge: f.category,
    content: f.answer
  }));

  return (
    <section id="frequently-asked-questions" className="py-16 md:py-24 bg-[#FAF9F6] border-t border-[#E8E4DC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="editorial" size="md" className="mb-3">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-[#0F2747]" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#1A1A1A] font-serif tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-[#5A544E] mt-2">
            Clear, honest answers about our non-surgical therapies, initial consultation, safety protocols, and clinic location.
          </p>

          {/* Search bar & Category filters */}
          <div className="mt-6 space-y-3">
            <div className="relative max-w-md mx-auto">
              <Search className="w-4 h-4 text-[#8A847C] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. pain, acupuncture, safety)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none shadow-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#1A1A1A] text-[#FAF9F6] shadow-xs'
                      : 'bg-white text-[#4A443D] border border-[#E8E4DC] hover:border-[#D5CFC5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accordion Component */}
        {accordionItems.length > 0 ? (
          <Accordion items={accordionItems} defaultOpenIndex={0} />
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-[#E8E4DC] text-center space-y-2">
            <p className="text-sm font-semibold text-[#1A1A1A]">No questions matched your search query.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-xs text-[#0F2747] font-bold hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Bottom Banner */}
        <div className="mt-10 bg-white p-6 rounded-2xl border border-[#E8E4DC] text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A] font-serif">Have a specific question about your symptoms?</h3>
            <p className="text-xs text-[#5A544E] mt-0.5">
              Healer Abdul Mallik addresses all individual questions during your clinical consultation.
            </p>
          </div>
          <Button variant="accent" size="sm" onClick={onOpenBooking}>
            Book an Appointment
          </Button>
        </div>
      </div>
    </section>
  );
};
